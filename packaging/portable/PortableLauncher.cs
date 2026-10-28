using System;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Net;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Threading;

internal sealed class InstanceState
{
    public int ProcessId;
    public int Port;
    public string Token;
    public string PackageRoot;
}

internal static class PortableLauncher
{
    private static readonly TimeSpan StartupTimeout = TimeSpan.FromSeconds(25);
    private static readonly TimeSpan ShutdownTimeout = TimeSpan.FromSeconds(30);

    private static int Main(string[] args)
    {
        try
        {
            string executableName = Path.GetFileNameWithoutExtension(Assembly.GetExecutingAssembly().Location);
            string launcherDirectory = NormalizeRoot(Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location));
            DirectoryInfo platformDirectory = new DirectoryInfo(launcherDirectory);
            if (!String.Equals(platformDirectory.Name, "Windows", StringComparison.OrdinalIgnoreCase)) return 1;
            DirectoryInfo packageDirectory = platformDirectory.Parent;
            if (packageDirectory == null) return 1;
            string packageRoot = NormalizeRoot(packageDirectory.FullName);
            bool noBrowser = Array.Exists(args, value => String.Equals(value, "--no-browser", StringComparison.OrdinalIgnoreCase));

            if (String.Equals(executableName, "Start COSTBREAKDOWN", StringComparison.OrdinalIgnoreCase))
            {
                return Start(packageRoot, launcherDirectory, noBrowser);
            }

            if (String.Equals(executableName, "Stop COSTBREAKDOWN", StringComparison.OrdinalIgnoreCase))
            {
                return Stop(packageRoot);
            }

            return 1;
        }
        catch
        {
            return 1;
        }
    }

    private static int Start(string packageRoot, string launcherDirectory, bool noBrowser)
    {
        string statePath = GetStatePath(packageRoot);
        string packageId = Path.GetFileName(Path.GetDirectoryName(statePath));
        using (Mutex mutex = new Mutex(false, "Local\\COSTBREAKDOWN_Portable_" + packageId))
        {
            if (!TryAcquire(mutex)) return 2;
            try
            {
                InstanceState state = ReadState(statePath, packageRoot);
                if (state != null && IsHealthy(state))
                {
                    if (!noBrowser) OpenBrowser(state.Port);
                    return 0;
                }

                DeleteStaleState(statePath);
                string token = CreateToken();
                string serverScript = Path.Combine(launcherDirectory, "Serve-COSTBREAKDOWN.ps1");
                string appRoot = Path.Combine(packageRoot, "app");
                if (!File.Exists(serverScript) || !File.Exists(Path.Combine(appRoot, "index.html"))) return 3;

                string powershell = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), "WindowsPowerShell", "v1.0", "powershell.exe");
                if (!File.Exists(powershell)) return 4;

                ProcessStartInfo startInfo = new ProcessStartInfo();
                startInfo.FileName = powershell;
                startInfo.Arguments = "-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File " + Quote(serverScript) +
                    " -PackageRoot " + Quote(packageRoot) + " -AppRoot " + Quote(appRoot) +
                    " -StatePath " + Quote(statePath) + " -InstanceToken " + Quote(token) + (noBrowser ? " -NoBrowser" : String.Empty);
                startInfo.WorkingDirectory = launcherDirectory;
                startInfo.UseShellExecute = false;
                startInfo.CreateNoWindow = true;
                startInfo.WindowStyle = ProcessWindowStyle.Hidden;

                using (Process server = Process.Start(startInfo))
                {
                    if (server == null) return 5;
                    DateTime deadline = DateTime.UtcNow + StartupTimeout;
                    while (DateTime.UtcNow < deadline)
                    {
                        state = ReadState(statePath, packageRoot);
                        if (state != null && String.Equals(state.Token, token, StringComparison.Ordinal) && IsHealthy(state))
                        {
                            if (!noBrowser) OpenBrowser(state.Port);
                            return 0;
                        }

                        if (server.HasExited) break;
                        Thread.Sleep(100);
                    }

                    if (!server.HasExited)
                    {
                        try { server.Kill(); server.WaitForExit(5000); }
                        catch { }
                    }
                }

                DeleteStateIfTokenMatches(statePath, token, packageRoot);
                return 6;
            }
            finally
            {
                mutex.ReleaseMutex();
            }
        }
    }

    private static int Stop(string packageRoot)
    {
        string statePath = GetStatePath(packageRoot);
        string packageId = Path.GetFileName(Path.GetDirectoryName(statePath));
        using (Mutex mutex = new Mutex(false, "Local\\COSTBREAKDOWN_Portable_" + packageId))
        {
            if (!TryAcquire(mutex)) return 2;
            try
            {
                InstanceState state = ReadState(statePath, packageRoot);
                if (state == null)
                {
                    DeleteStaleState(statePath);
                    return 0;
                }
                if (!IsHealthy(state))
                {
                    DeleteStateIfMatches(statePath, state);
                    return 0;
                }

                SendControlRequest(state, "__costbreakdown_stop");
                DateTime deadline = DateTime.UtcNow + ShutdownTimeout;
                while (DateTime.UtcNow < deadline)
                {
                    if (!IsProcessRunning(state.ProcessId) && !IsHealthy(state))
                    {
                        DeleteStateIfMatches(statePath, state);
                        return 0;
                    }
                    Thread.Sleep(150);
                }

                return 7;
            }
            finally
            {
                mutex.ReleaseMutex();
            }
        }
    }

    private static bool TryAcquire(Mutex mutex)
    {
        try { return mutex.WaitOne(TimeSpan.FromSeconds(30)); }
        catch (AbandonedMutexException) { return true; }
    }

    private static string GetStatePath(string packageRoot)
    {
        string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        if (String.IsNullOrEmpty(localAppData)) throw new InvalidOperationException("Local application data directory is unavailable.");
        string packageId = Hash(NormalizeRoot(packageRoot).ToLowerInvariant());
        string directory = Path.Combine(localAppData, "COSTBREAKDOWN", "Portable", packageId);
        Directory.CreateDirectory(directory);
        return Path.Combine(directory, "instance.state");
    }

    private static string NormalizeRoot(string path)
    {
        string fullPath = Path.GetFullPath(path);
        string root = Path.GetPathRoot(fullPath);
        while (fullPath.Length > root.Length && (fullPath[fullPath.Length - 1] == Path.DirectorySeparatorChar || fullPath[fullPath.Length - 1] == Path.AltDirectorySeparatorChar))
        {
            fullPath = fullPath.Substring(0, fullPath.Length - 1);
        }
        return fullPath;
    }

    private static string Hash(string value)
    {
        using (SHA256 sha = SHA256.Create())
        {
            byte[] digest = sha.ComputeHash(Encoding.UTF8.GetBytes(value));
            StringBuilder result = new StringBuilder(digest.Length * 2);
            foreach (byte item in digest) result.Append(item.ToString("x2", CultureInfo.InvariantCulture));
            return result.ToString();
        }
    }

    private static string CreateToken()
    {
        byte[] bytes = new byte[32];
        using (RandomNumberGenerator random = RandomNumberGenerator.Create()) random.GetBytes(bytes);
        StringBuilder result = new StringBuilder(bytes.Length * 2);
        foreach (byte item in bytes) result.Append(item.ToString("x2", CultureInfo.InvariantCulture));
        return result.ToString();
    }

    private static string Quote(string value)
    {
        return "\"" + value.Replace("\"", "\\\"") + "\"";
    }

    private static InstanceState ReadState(string statePath, string packageRoot)
    {
        if (!File.Exists(statePath)) return null;
        try
        {
            string[] lines = File.ReadAllLines(statePath, Encoding.UTF8);
            string version = null;
            string pid = null;
            string port = null;
            string token = null;
            string encodedRoot = null;
            foreach (string line in lines)
            {
                int separator = line.IndexOf('=');
                if (separator <= 0) continue;
                string key = line.Substring(0, separator);
                string value = line.Substring(separator + 1);
                if (key == "version") version = value;
                else if (key == "pid") pid = value;
                else if (key == "port") port = value;
                else if (key == "token") token = value;
                else if (key == "root") encodedRoot = value;
            }

            int processId;
            int portNumber;
            if (version != "1" || !Int32.TryParse(pid, NumberStyles.None, CultureInfo.InvariantCulture, out processId) || processId <= 0 ||
                !Int32.TryParse(port, NumberStyles.None, CultureInfo.InvariantCulture, out portNumber) || portNumber < 1 || portNumber > 65535 ||
                !IsToken(token) || String.IsNullOrEmpty(encodedRoot)) return null;

            string storedRoot = Encoding.UTF8.GetString(Convert.FromBase64String(encodedRoot));
            if (!String.Equals(NormalizeRoot(storedRoot), NormalizeRoot(packageRoot), StringComparison.OrdinalIgnoreCase)) return null;
            return new InstanceState { ProcessId = processId, Port = portNumber, Token = token, PackageRoot = storedRoot };
        }
        catch
        {
            return null;
        }
    }

    private static bool IsToken(string value)
    {
        if (String.IsNullOrEmpty(value) || value.Length != 64) return false;
        foreach (char item in value)
        {
            if (!((item >= '0' && item <= '9') || (item >= 'a' && item <= 'f'))) return false;
        }
        return true;
    }

    private static bool IsHealthy(InstanceState state)
    {
        try
        {
            string response = SendControlRequest(state, "__costbreakdown_health");
            return String.Equals(response, "COSTBREAKDOWN|" + state.ProcessId.ToString(CultureInfo.InvariantCulture) + "|" + state.Port.ToString(CultureInfo.InvariantCulture), StringComparison.Ordinal);
        }
        catch
        {
            return false;
        }
    }

    private static string SendControlRequest(InstanceState state, string route)
    {
        HttpWebRequest request = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:" + state.Port.ToString(CultureInfo.InvariantCulture) + "/" + route + "?token=" + Uri.EscapeDataString(state.Token));
        request.Method = "GET";
        request.Proxy = null;
        request.Timeout = 1500;
        request.ReadWriteTimeout = 1500;
        request.KeepAlive = false;
        using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
        using (StreamReader reader = new StreamReader(response.GetResponseStream(), Encoding.UTF8))
        {
            return reader.ReadToEnd();
        }
    }

    private static void DeleteStaleState(string statePath)
    {
        try { if (File.Exists(statePath)) File.Delete(statePath); }
        catch { }
    }

    private static void DeleteStateIfTokenMatches(string statePath, string token, string packageRoot)
    {
        try
        {
            InstanceState current = ReadState(statePath, packageRoot);
            if (current != null && String.Equals(current.Token, token, StringComparison.Ordinal))
            {
                File.Delete(statePath);
            }
        }
        catch { }
    }

    private static void DeleteStateIfMatches(string statePath, InstanceState expected)
    {
        try
        {
            InstanceState current = ReadState(statePath, expected.PackageRoot);
            if (current != null && current.ProcessId == expected.ProcessId && current.Port == expected.Port && String.Equals(current.Token, expected.Token, StringComparison.Ordinal))
            {
                File.Delete(statePath);
            }
        }
        catch { }
    }

    private static bool IsProcessRunning(int processId)
    {
        try
        {
            using (Process process = Process.GetProcessById(processId)) return !process.HasExited;
        }
        catch
        {
            return false;
        }
    }

    private static void OpenBrowser(int port)
    {
        ProcessStartInfo browser = new ProcessStartInfo("http://127.0.0.1:" + port.ToString(CultureInfo.InvariantCulture) + "/");
        browser.UseShellExecute = true;
        Process.Start(browser);
    }
}
