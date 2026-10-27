param(
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$packageRoot = [System.IO.Path]::GetFullPath($PSScriptRoot)
$indexPath = [System.IO.Path]::GetFullPath((Join-Path $packageRoot 'index.html'))

if (-not (Test-Path -LiteralPath $indexPath -PathType Leaf)) {
    throw 'Portable application file index.html is missing from this folder.'
}

$packageRootPrefix = $packageRoot
if (-not $packageRootPrefix.EndsWith([System.IO.Path]::DirectorySeparatorChar.ToString())) {
    $packageRootPrefix += [System.IO.Path]::DirectorySeparatorChar
}

function Write-HttpResponse {
    param(
        [System.IO.Stream]$Stream,
        [int]$StatusCode,
        [string]$Reason,
        [string]$ContentType,
        [byte[]]$Body,
        [switch]$HeadOnly
    )

    $lineBreak = [string]([char]13) + [string]([char]10)
    $headerText = 'HTTP/1.1 ' + $StatusCode + ' ' + $Reason + $lineBreak +
        'Content-Type: ' + $ContentType + $lineBreak +
        'Content-Length: ' + $Body.Length + $lineBreak +
        'Cache-Control: no-store' + $lineBreak +
        'X-Content-Type-Options: nosniff' + $lineBreak +
        'Connection: close' + $lineBreak + $lineBreak
    $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headerText)
    $Stream.Write($headerBytes, 0, $headerBytes.Length)

    if (-not $HeadOnly -and $Body.Length -gt 0) {
        $Stream.Write($Body, 0, $Body.Length)
    }

    $Stream.Flush()
}

function Get-ContentType {
    param([string]$Path)

    switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
        '.html' { return 'text/html; charset=utf-8' }
        '.js' { return 'text/javascript; charset=utf-8' }
        '.mjs' { return 'text/javascript; charset=utf-8' }
        '.css' { return 'text/css; charset=utf-8' }
        '.svg' { return 'image/svg+xml' }
        '.png' { return 'image/png' }
        '.jpg' { return 'image/jpeg' }
        '.jpeg' { return 'image/jpeg' }
        '.webp' { return 'image/webp' }
        '.ico' { return 'image/x-icon' }
        '.woff' { return 'font/woff' }
        '.woff2' { return 'font/woff2' }
        '.json' { return 'application/json; charset=utf-8' }
        default { return 'application/octet-stream' }
    }
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)

try {
    $listener.Start()
    $port = [int]$listener.LocalEndpoint.Port
    $baseUrl = 'http://127.0.0.1:' + $port + '/'

    Write-Output ('READY_URL=' + $baseUrl)
    Write-Output 'COSTBREAKDOWN is running. Keep this window open; press Ctrl+C to stop.'

    if (-not $NoBrowser) {
        Start-Process -FilePath $baseUrl
    }

    while ($true) {
        $client = $listener.AcceptTcpClient()
        $client.ReceiveTimeout = 10000
        $client.SendTimeout = 10000
        $networkStream = $client.GetStream()
        $reader = $null

        try {
            $reader = [System.IO.StreamReader]::new($networkStream, [System.Text.Encoding]::ASCII, $false, 4096, $true)
            $requestLine = $reader.ReadLine()

            if ([string]::IsNullOrWhiteSpace($requestLine)) {
                $emptyBody = [System.Text.Encoding]::UTF8.GetBytes('Bad request')
                Write-HttpResponse -Stream $networkStream -StatusCode 400 -Reason 'Bad Request' -ContentType 'text/plain; charset=utf-8' -Body $emptyBody
                continue
            }

            $requestParts = $requestLine.Split(' ')
            if ($requestParts.Length -lt 2) {
                $emptyBody = [System.Text.Encoding]::UTF8.GetBytes('Bad request')
                Write-HttpResponse -Stream $networkStream -StatusCode 400 -Reason 'Bad Request' -ContentType 'text/plain; charset=utf-8' -Body $emptyBody
                continue
            }

            $method = $requestParts[0].ToUpperInvariant()
            $requestTarget = $requestParts[1]
            while ($true) {
                $headerLine = $reader.ReadLine()
                if ([string]::IsNullOrEmpty($headerLine)) { break }
            }

            if ($method -ne 'GET' -and $method -ne 'HEAD') {
                $methodBody = [System.Text.Encoding]::UTF8.GetBytes('Method not allowed')
                Write-HttpResponse -Stream $networkStream -StatusCode 405 -Reason 'Method Not Allowed' -ContentType 'text/plain; charset=utf-8' -Body $methodBody
                continue
            }

            $requestUri = [System.Uri]::new([System.Uri]::new($baseUrl), $requestTarget)
            $relativePath = [System.Uri]::UnescapeDataString($requestUri.AbsolutePath.TrimStart('/'))

            if ($relativePath -eq 'favicon.ico') {
                $noBody = [byte[]]@()
                Write-HttpResponse -Stream $networkStream -StatusCode 204 -Reason 'No Content' -ContentType 'image/x-icon' -Body $noBody -HeadOnly:($method -eq 'HEAD')
                continue
            }

            if ([string]::IsNullOrWhiteSpace($relativePath)) {
                $filePath = $indexPath
            } else {
                $localRelativePath = $relativePath.Replace('/', [System.IO.Path]::DirectorySeparatorChar)
                $filePath = [System.IO.Path]::GetFullPath((Join-Path $packageRoot $localRelativePath))
            }

            $insidePackage = $filePath.Equals($indexPath, [System.StringComparison]::OrdinalIgnoreCase) -or
                $filePath.StartsWith($packageRootPrefix, [System.StringComparison]::OrdinalIgnoreCase)

            if (-not $insidePackage) {
                $notFoundBody = [System.Text.Encoding]::UTF8.GetBytes('Not found')
                Write-HttpResponse -Stream $networkStream -StatusCode 404 -Reason 'Not Found' -ContentType 'text/plain; charset=utf-8' -Body $notFoundBody
                continue
            }

            if (-not (Test-Path -LiteralPath $filePath -PathType Leaf) -and [string]::IsNullOrEmpty([System.IO.Path]::GetExtension($filePath))) {
                $filePath = $indexPath
            }

            if (-not (Test-Path -LiteralPath $filePath -PathType Leaf)) {
                $notFoundBody = [System.Text.Encoding]::UTF8.GetBytes('Not found')
                Write-HttpResponse -Stream $networkStream -StatusCode 404 -Reason 'Not Found' -ContentType 'text/plain; charset=utf-8' -Body $notFoundBody
                continue
            }

            $body = [System.IO.File]::ReadAllBytes($filePath)
            Write-HttpResponse -Stream $networkStream -StatusCode 200 -Reason 'OK' -ContentType (Get-ContentType $filePath) -Body $body -HeadOnly:($method -eq 'HEAD')
        }
        catch {
            # The browser may close an idle or cancelled request; continue serving the app.
        }
        finally {
            if ($null -ne $reader) { $reader.Dispose() }
            $client.Close()
        }
    }
}
finally {
    $listener.Stop()
}
