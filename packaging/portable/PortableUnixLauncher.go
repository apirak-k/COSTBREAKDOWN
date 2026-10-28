//go:build darwin || linux

package main

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"os/signal"
	"path"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"time"
)

const (
	startupTimeout  = 25 * time.Second
	shutdownTimeout = 20 * time.Second
)

type instanceState struct {
	Version     int    `json:"version"`
	PID         int    `json:"pid"`
	Port        int    `json:"port"`
	Token       string `json:"token"`
	PackageRoot string `json:"packageRoot"`
}

func main() {
	if err := run(os.Args[1:]); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run(args []string) error {
	mode := ""
	noBrowser := false
	root := ""
	token := ""
	for index := 0; index < len(args); index++ {
		switch args[index] {
		case "--start":
			mode = "start"
		case "--stop":
			mode = "stop"
		case "--serve":
			mode = "serve"
		case "--no-browser":
			noBrowser = true
		case "--package-root", "--token":
			if index+1 >= len(args) {
				return fmt.Errorf("missing value for %s", args[index])
			}
			index++
			if args[index-1] == "--package-root" {
				root = args[index]
			} else {
				token = args[index]
			}
		}
	}
	if mode == "" {
		name := strings.TrimSuffix(filepath.Base(os.Args[0]), filepath.Ext(os.Args[0]))
		if name == "Stop COSTBREAKDOWN" {
			mode = "stop"
		} else {
			mode = "start"
		}
	}
	if root == "" {
		executable, err := os.Executable()
		if err != nil {
			return err
		}
		root, err = packageRootForExecutable(executable, runtime.GOOS)
		if err != nil {
			return err
		}
	}
	root, err := filepath.Abs(root)
	if err != nil {
		return err
	}
	root = filepath.Clean(root)

	switch mode {
	case "start":
		return startPackage(root, noBrowser)
	case "stop":
		return stopPackage(root)
	case "serve":
		if !isToken(token) {
			return errors.New("invalid server token")
		}
		return servePackage(root, token)
	default:
		return fmt.Errorf("unknown launcher mode %q", mode)
	}
}

// packageRootForExecutable resolves the shared package root from each platform helper.
// macOS: package/macOS/Start.app/Contents/MacOS/executable
// Linux: package/Linux/runtime/helper
func packageRootForExecutable(executable, goos string) (string, error) {
	if !path.IsAbs(executable) {
		return "", errors.New("launcher path must be absolute")
	}
	directory := path.Dir(path.Clean(executable))
	levels := 0
	switch goos {
	case "darwin":
		levels = 4
	case "linux":
		levels = 2
	default:
		return "", fmt.Errorf("unsupported Unix package layout for %s", goos)
	}
	for index := 0; index < levels; index++ {
		directory = path.Dir(directory)
	}
	if directory == "." || directory == "/" {
		return "", errors.New("could not resolve the package directory")
	}
	return path.Clean(directory), nil
}

func stateDirectory(packageRoot string) (string, error) {
	digest := sha256.Sum256([]byte(filepath.Clean(packageRoot)))
	packageID := hex.EncodeToString(digest[:])
	var base string
	if runtime.GOOS == "darwin" {
		home, err := os.UserHomeDir()
		if err != nil {
			return "", err
		}
		base = filepath.Join(home, "Library", "Application Support", "COSTBREAKDOWN", "Portable")
	} else {
		base = os.Getenv("XDG_STATE_HOME")
		if base == "" || !filepath.IsAbs(base) {
			home, err := os.UserHomeDir()
			if err != nil {
				return "", err
			}
			base = filepath.Join(home, ".local", "state")
		}
		base = filepath.Join(base, "costbreakdown", "portable")
	}
	directory := filepath.Join(base, packageID)
	if err := os.MkdirAll(directory, 0o700); err != nil {
		return "", err
	}
	return directory, nil
}

func acquireInstanceLock(directory string) (*os.File, error) {
	lock, err := os.OpenFile(filepath.Join(directory, "instance.lock"), os.O_CREATE|os.O_RDWR, 0o600)
	if err != nil {
		return nil, err
	}
	if err := syscall.Flock(int(lock.Fd()), syscall.LOCK_EX); err != nil {
		lock.Close()
		return nil, err
	}
	return lock, nil
}

func releaseInstanceLock(lock *os.File) {
	if lock == nil {
		return
	}
	_ = syscall.Flock(int(lock.Fd()), syscall.LOCK_UN)
	_ = lock.Close()
}

func startPackage(packageRoot string, noBrowser bool) error {
	directory, err := stateDirectory(packageRoot)
	if err != nil {
		return err
	}
	lock, err := acquireInstanceLock(directory)
	if err != nil {
		return err
	}
	defer releaseInstanceLock(lock)
	statePath := filepath.Join(directory, "instance.json")

	state := readState(statePath)
	if validInstanceState(state, packageRoot) && isHealthy(state) {
		if !noBrowser {
			return openBrowser(state.Port)
		}
		return nil
	}
	_ = os.Remove(statePath)

	token, err := createToken()
	if err != nil {
		return err
	}
	executable, err := os.Executable()
	if err != nil {
		return err
	}
	command := exec.Command(executable, "--serve", "--package-root", packageRoot, "--token", token)
	command.Stdin = nil
	command.Stdout = nil
	command.Stderr = nil
	command.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
	if err := command.Start(); err != nil {
		return err
	}
	serverPID := command.Process.Pid
	done := make(chan error, 1)
	go func() { done <- command.Wait() }()

	deadline := time.Now().Add(startupTimeout)
	for time.Now().Before(deadline) {
		select {
		case processErr := <-done:
			return fmt.Errorf("portable server exited before becoming ready: %w", processErr)
		default:
		}
		state = readState(statePath)
		if validInstanceState(state, packageRoot) && state.Token == token && state.PID == serverPID && isHealthy(state) {
			if !noBrowser {
				return openBrowser(state.Port)
			}
			return nil
		}
		time.Sleep(100 * time.Millisecond)
	}
	_ = command.Process.Kill()
	_ = os.Remove(statePath)
	return errors.New("portable server did not become ready before timeout")
}

func stopPackage(packageRoot string) error {
	directory, err := stateDirectory(packageRoot)
	if err != nil {
		return err
	}
	lock, err := acquireInstanceLock(directory)
	if err != nil {
		return err
	}
	defer releaseInstanceLock(lock)
	statePath := filepath.Join(directory, "instance.json")
	state := readState(statePath)
	if !validInstanceState(state, packageRoot) || !isHealthy(state) {
		_ = os.Remove(statePath)
		return nil
	}
	if err := requestControl(state, "__costbreakdown_stop"); err != nil {
		return err
	}
	deadline := time.Now().Add(shutdownTimeout)
	for time.Now().Before(deadline) {
		current := readState(statePath)
		if !validInstanceState(current, packageRoot) || !isHealthy(current) {
			return nil
		}
		time.Sleep(100 * time.Millisecond)
	}
	return errors.New("portable server did not stop before timeout")
}

func servePackage(packageRoot, token string) error {
	appRoot := filepath.Join(packageRoot, "app")
	indexPath := filepath.Join(appRoot, "index.html")
	if _, err := os.Stat(indexPath); err != nil {
		return fmt.Errorf("portable app index is unavailable: %w", err)
	}
	listener, err := listenLoopback()
	if err != nil {
		return err
	}
	defer listener.Close()
	address := listener.Addr().(*net.TCPAddr)
	state := instanceState{Version: 1, PID: os.Getpid(), Port: address.Port, Token: token, PackageRoot: packageRoot}
	directory, err := stateDirectory(packageRoot)
	if err != nil {
		return err
	}
	statePath := filepath.Join(directory, "instance.json")
	if err := writeState(statePath, state); err != nil {
		return err
	}
	defer removeOwnState(statePath, state)

	stop := make(chan struct{}, 1)
	server := &http.Server{Handler: staticHandler(appRoot, state, stop), ReadHeaderTimeout: 5 * time.Second}
	serveDone := make(chan error, 1)
	go func() { serveDone <- server.Serve(listener) }()
	signalContext, stopSignals := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stopSignals()
	select {
	case <-stop:
	case <-signalContext.Done():
	case serveErr := <-serveDone:
		if !errors.Is(serveErr, http.ErrServerClosed) {
			return serveErr
		}
		return nil
	}
	shutdownContext, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownContext); err != nil {
		return err
	}
	return nil
}

func listenLoopback() (net.Listener, error) {
	return net.Listen("tcp4", "127.0.0.1:0")
}

func staticHandler(appRoot string, state instanceState, stop chan struct{}) http.Handler {
	root, _ := filepath.Abs(appRoot)
	root = filepath.Clean(root)
	return http.HandlerFunc(func(response http.ResponseWriter, request *http.Request) {
		if request.Method != http.MethodGet && request.Method != http.MethodHead {
			http.Error(response, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		if request.URL.Path == "/favicon.ico" {
			response.WriteHeader(http.StatusNoContent)
			return
		}
		if request.URL.Path == "/__costbreakdown_health" || request.URL.Path == "/__costbreakdown_stop" {
			if request.Method != http.MethodGet || !matchesControlToken(state.Token, request.URL.Query().Get("token")) {
				http.NotFound(response, request)
				return
			}
			if request.URL.Path == "/__costbreakdown_health" {
				response.Header().Set("Content-Type", "text/plain; charset=utf-8")
				_, _ = fmt.Fprintf(response, "COSTBREAKDOWN|%d|%d", state.PID, state.Port)
				return
			}
			response.WriteHeader(http.StatusAccepted)
			_, _ = io.WriteString(response, "Stopping")
			select {
			case stop <- struct{}{}:
			default:
			}
			return
		}

		filePath, err := resolveStaticFile(root, request.URL.EscapedPath())
		if err != nil {
			http.NotFound(response, request)
			return
		}
		file, err := os.Open(filePath)
		if err != nil {
			http.NotFound(response, request)
			return
		}
		defer file.Close()
		info, err := file.Stat()
		if err != nil || !info.Mode().IsRegular() {
			http.NotFound(response, request)
			return
		}
		contentType := mime.TypeByExtension(filepath.Ext(filePath))
		if contentType == "" {
			contentType = "application/octet-stream"
		}
		response.Header().Set("Content-Type", contentType)
		response.Header().Set("Cache-Control", "no-store")
		response.Header().Set("X-Content-Type-Options", "nosniff")
		http.ServeContent(response, request, info.Name(), info.ModTime(), file)
	})
}

func resolveStaticFile(appRoot, requestPath string) (string, error) {
	decodedPath, err := url.PathUnescape(requestPath)
	if err != nil || strings.ContainsRune(decodedPath, 0) || strings.Contains(decodedPath, `\`) {
		return "", errors.New("invalid request path")
	}
	for _, segment := range strings.Split(decodedPath, "/") {
		if segment == ".." {
			return "", errors.New("request path escapes app directory")
		}
	}
	clean := path.Clean("/" + strings.TrimPrefix(decodedPath, "/"))
	relative := strings.TrimPrefix(clean, "/")
	if relative == ".." || strings.HasPrefix(relative, "../") {
		return "", errors.New("request path escapes app directory")
	}
	if relative == "." || relative == "" {
		relative = "index.html"
	}
	root, err := filepath.Abs(appRoot)
	if err != nil {
		return "", err
	}
	root = filepath.Clean(root)
	filePath := filepath.Clean(filepath.Join(root, filepath.FromSlash(relative)))
	inside, err := filepath.Rel(root, filePath)
	if err != nil || inside == ".." || strings.HasPrefix(inside, ".."+string(filepath.Separator)) {
		return "", errors.New("request path escapes app directory")
	}
	if _, err := os.Stat(filePath); err != nil {
		if path.Ext(relative) != "" {
			return "", err
		}
		filePath = filepath.Join(root, "index.html")
	}
	resolvedRoot, err := filepath.EvalSymlinks(root)
	if err != nil {
		return "", err
	}
	resolvedFile, err := filepath.EvalSymlinks(filePath)
	if err != nil {
		return "", err
	}
	relativeResolved, err := filepath.Rel(resolvedRoot, resolvedFile)
	if err != nil || relativeResolved == ".." || strings.HasPrefix(relativeResolved, ".."+string(filepath.Separator)) {
		return "", errors.New("resolved request path escapes app directory")
	}
	return resolvedFile, nil
}

func validInstanceState(state instanceState, packageRoot string) bool {
	if state.Version != 1 || state.PID <= 0 || state.Port < 1 || state.Port > 65535 || !isToken(state.Token) || state.PackageRoot == "" {
		return false
	}
	stored, err := filepath.Abs(state.PackageRoot)
	if err != nil {
		return false
	}
	expected, err := filepath.Abs(packageRoot)
	if err != nil {
		return false
	}
	return filepath.Clean(stored) == filepath.Clean(expected)
}

func matchesControlToken(expected, supplied string) bool {
	return isToken(expected) && isToken(supplied) && subtle.ConstantTimeCompare([]byte(expected), []byte(supplied)) == 1
}

func isToken(token string) bool {
	if len(token) != 64 {
		return false
	}
	for _, character := range token {
		if !((character >= '0' && character <= '9') || (character >= 'a' && character <= 'f')) {
			return false
		}
	}
	return true
}

func createToken() (string, error) {
	value := make([]byte, 32)
	if _, err := rand.Read(value); err != nil {
		return "", err
	}
	return hex.EncodeToString(value), nil
}

func readState(statePath string) instanceState {
	contents, err := os.ReadFile(statePath)
	if err != nil {
		return instanceState{}
	}
	var state instanceState
	if json.Unmarshal(contents, &state) != nil {
		return instanceState{}
	}
	return state
}

func writeState(statePath string, state instanceState) error {
	contents, err := json.Marshal(state)
	if err != nil {
		return err
	}
	temporaryPath := fmt.Sprintf("%s.%d.tmp", statePath, os.Getpid())
	file, err := os.OpenFile(temporaryPath, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0o600)
	if err != nil {
		return err
	}
	if _, err = file.Write(contents); err == nil {
		err = file.Sync()
	}
	closeErr := file.Close()
	if err != nil {
		_ = os.Remove(temporaryPath)
		return err
	}
	if closeErr != nil {
		_ = os.Remove(temporaryPath)
		return closeErr
	}
	if err := os.Rename(temporaryPath, statePath); err != nil {
		_ = os.Remove(temporaryPath)
		return err
	}
	return nil
}

func removeOwnState(statePath string, expected instanceState) {
	current := readState(statePath)
	if current.PID == expected.PID && current.Port == expected.Port && current.Token == expected.Token {
		_ = os.Remove(statePath)
	}
}

func isHealthy(state instanceState) bool {
	if !isToken(state.Token) || state.Port < 1 || state.Port > 65535 {
		return false
	}
	request, err := http.NewRequest(http.MethodGet, fmt.Sprintf("http://127.0.0.1:%d/__costbreakdown_health?token=%s", state.Port, url.QueryEscape(state.Token)), nil)
	if err != nil {
		return false
	}
	client := localHTTPClient(1200 * time.Millisecond)
	response, err := client.Do(request)
	if err != nil {
		return false
	}
	defer response.Body.Close()
	body, err := io.ReadAll(response.Body)
	return err == nil && response.StatusCode == http.StatusOK && string(body) == fmt.Sprintf("COSTBREAKDOWN|%d|%d", state.PID, state.Port)
}

func requestControl(state instanceState, route string) error {
	request, err := http.NewRequest(http.MethodGet, fmt.Sprintf("http://127.0.0.1:%d/%s?token=%s", state.Port, route, url.QueryEscape(state.Token)), nil)
	if err != nil {
		return err
	}
	client := localHTTPClient(2 * time.Second)
	response, err := client.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if route == "__costbreakdown_stop" && response.StatusCode != http.StatusAccepted {
		return fmt.Errorf("server returned stop status %s", response.Status)
	}
	return nil
}

func localHTTPClient(timeout time.Duration) *http.Client {
	return &http.Client{
		Timeout: timeout,
		Transport: &http.Transport{
			Proxy:             nil,
			DisableKeepAlives: true,
		},
	}
}

func openBrowser(port int) error {
	url := fmt.Sprintf("http://127.0.0.1:%d/", port)
	commandName := "xdg-open"
	if runtime.GOOS == "darwin" {
		commandName = "open"
	}
	command := exec.Command(commandName, url)
	command.Stdin = nil
	command.Stdout = nil
	command.Stderr = nil
	if err := command.Start(); err != nil {
		return fmt.Errorf("could not open the default browser: %w", err)
	}
	return command.Process.Release()
}

func init() {
	_ = mime.AddExtensionType(".mjs", "text/javascript; charset=utf-8")
}
