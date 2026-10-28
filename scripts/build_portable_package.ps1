param(
    [switch]$Rebuild,
    [string]$OutputName = 'COSTBREAKDOWN-portable-cross-platform',
    [string]$GoExecutable = ''
)

$ErrorActionPreference = 'Stop'

$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$releaseRoot = [System.IO.Path]::GetFullPath((Join-Path $repositoryRoot 'release'))
$portableSources = Join-Path $repositoryRoot 'packaging\portable'
$unixLauncherSource = Join-Path $portableSources 'PortableUnixLauncher.go'
$windowsLauncherSource = Join-Path $portableSources 'PortableLauncher.cs'
$windowsServerSource = Join-Path $portableSources 'Serve-COSTBREAKDOWN.ps1'
$packageReadmeSource = Join-Path $portableSources 'README.md'
$userGuideSource = Join-Path $repositoryRoot 'USER_GUIDE.md'
$imageSource = Join-Path $repositoryRoot 'docs\images'
$combineMachOScript = Join-Path $repositoryRoot 'scripts\combine_universal_macho.mjs'
$zipScript = Join-Path $repositoryRoot 'scripts\create_portable_package_zip.mjs'
$verifyScript = Join-Path $repositoryRoot 'scripts\verify_cross_platform_portable_package.mjs'
$distRoot = Join-Path $repositoryRoot 'dist'

if ($OutputName -notmatch '^[A-Za-z0-9][A-Za-z0-9._-]*$') {
    throw 'OutputName may contain only letters, numbers, dots, underscores, and hyphens.'
}

function Assert-ReleaseChild {
    param([string]$Path)

    $releasePrefix = $releaseRoot.TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
    $fullPath = [System.IO.Path]::GetFullPath($Path)
    if (-not $fullPath.StartsWith($releasePrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to modify a path outside the release folder: $fullPath"
    }
    return $fullPath
}

function Invoke-GoBuild {
    param(
        [string]$TargetOS,
        [string]$TargetArchitecture,
        [string]$Destination
    )

    $previousOS = $env:GOOS
    $previousArchitecture = $env:GOARCH
    $previousCGO = $env:CGO_ENABLED
    $previousModules = $env:GO111MODULE
    try {
        $env:GOOS = $TargetOS
        $env:GOARCH = $TargetArchitecture
        $env:CGO_ENABLED = '0'
        $env:GO111MODULE = 'off'
        & $GoExecutable build -trimpath '-ldflags=-s -w' -o $Destination $unixLauncherSource
        if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $Destination -PathType Leaf)) {
            throw "Go build failed for $TargetOS/$TargetArchitecture (exit code $LASTEXITCODE)."
        }
    }
    finally {
        $env:GOOS = $previousOS
        $env:GOARCH = $previousArchitecture
        $env:CGO_ENABLED = $previousCGO
        $env:GO111MODULE = $previousModules
    }
}

function Write-Utf8File {
    param([string]$Path, [string]$Contents)
    $portableContents = $Contents -replace "`r`n", "`n"
    [System.IO.File]::WriteAllText($Path, $portableContents, [System.Text.UTF8Encoding]::new($false))
}

foreach ($requiredSource in @(
    $unixLauncherSource,
    $windowsLauncherSource,
    $windowsServerSource,
    $packageReadmeSource,
    $userGuideSource,
    $combineMachOScript,
    $zipScript,
    $verifyScript
)) {
    if (-not (Test-Path -LiteralPath $requiredSource -PathType Leaf)) {
        throw "Required portable source file is missing: $requiredSource"
    }
}
if (-not (Test-Path -LiteralPath $imageSource -PathType Container)) {
    throw "Required user-guide screenshots are missing: $imageSource"
}

$compilerCandidates = @(
    (Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'),
    (Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe')
)
$compiler = $compilerCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
if (-not $compiler) {
    throw 'Windows .NET Framework C# compiler was not found. It is required only on the build computer.'
}
if (-not $GoExecutable) {
    $goCommand = Get-Command go.exe -ErrorAction SilentlyContinue
    if (-not $goCommand) { $goCommand = Get-Command go -ErrorAction SilentlyContinue }
    if ($goCommand) { $GoExecutable = $goCommand.Source }
}
if (-not $GoExecutable -or -not (Test-Path -LiteralPath $GoExecutable -PathType Leaf)) {
    throw 'Go was not found. Go is needed only on the build computer to produce the macOS/Linux helpers.'
}
$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $nodeCommand) { $nodeCommand = Get-Command node -ErrorAction SilentlyContinue }
if (-not $nodeCommand) { throw 'Node.js is required on the build computer for the web build and ZIP generation.' }
$nodeExecutable = $nodeCommand.Source

New-Item -ItemType Directory -Path $releaseRoot -Force | Out-Null
$releaseRoot = [System.IO.Path]::GetFullPath($releaseRoot)
$finalPackage = Assert-ReleaseChild -Path (Join-Path $releaseRoot $OutputName)
$finalArchive = Assert-ReleaseChild -Path (Join-Path $releaseRoot ($OutputName + '.zip'))
if ((Test-Path -LiteralPath $finalPackage) -or (Test-Path -LiteralPath $finalArchive)) {
    if (-not $Rebuild) {
        throw "Portable output already exists: $finalPackage or $finalArchive. Use -Rebuild to replace it after the new package validates."
    }
}

$stageParent = Assert-ReleaseChild -Path (Join-Path $releaseRoot ('.COSTBREAKDOWN-stage-' + [guid]::NewGuid().ToString('N')))
$stageRoot = Join-Path $stageParent $OutputName
$stageArchive = Join-Path $stageParent ($OutputName + '.zip')
$previousPackage = Join-Path $stageParent 'previous-package'
$previousArchive = Join-Path $stageParent 'previous-package.zip'
$packageMoved = $false
$archiveMoved = $false
$oldPackageMoved = $false
$oldArchiveMoved = $false
$outputsReplaced = $false

try {
    Push-Location $repositoryRoot
    try {
        & npm.cmd run build
        if ($LASTEXITCODE -ne 0) { throw "npm run build failed with exit code $LASTEXITCODE." }
    }
    finally {
        Pop-Location
    }

    if (-not (Test-Path -LiteralPath (Join-Path $distRoot 'index.html') -PathType Leaf) -or
        -not (Test-Path -LiteralPath (Join-Path $distRoot 'assets') -PathType Container)) {
        throw 'Build output must contain dist/index.html and dist/assets.'
    }

    $windowsRoot = Join-Path $stageRoot 'Windows'
    $macRoot = Join-Path $stageRoot 'macOS'
    $linuxRoot = Join-Path $stageRoot 'Linux'
    $appRoot = Join-Path $stageRoot 'app'
    New-Item -ItemType Directory -Path $windowsRoot, $macRoot, $linuxRoot, $appRoot -Force | Out-Null

    Copy-Item -LiteralPath $packageReadmeSource -Destination (Join-Path $stageRoot 'README.md')
    Copy-Item -LiteralPath $userGuideSource -Destination (Join-Path $stageRoot 'USER_GUIDE.md')
    $packageImages = Join-Path $stageRoot 'docs\images'
    New-Item -ItemType Directory -Path $packageImages -Force | Out-Null
    Copy-Item -Path (Join-Path $imageSource '*') -Destination $packageImages -Recurse
    Copy-Item -LiteralPath (Join-Path $distRoot 'index.html') -Destination $appRoot
    Copy-Item -LiteralPath (Join-Path $distRoot 'assets') -Destination $appRoot -Recurse
    Copy-Item -LiteralPath $windowsServerSource -Destination $windowsRoot

    $windowsStart = Join-Path $windowsRoot 'Start COSTBREAKDOWN.exe'
    & $compiler '/nologo' '/target:winexe' '/optimize+' ("/out:$windowsStart") $windowsLauncherSource
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $windowsStart -PathType Leaf)) {
        throw "Could not compile the silent Windows launcher (exit code $LASTEXITCODE)."
    }
    Copy-Item -LiteralPath $windowsStart -Destination (Join-Path $windowsRoot 'Stop COSTBREAKDOWN.exe')

    $unixRuntime = Join-Path $stageRoot '.unix-build'
    New-Item -ItemType Directory -Path $unixRuntime | Out-Null

    $linuxRuntime = Join-Path $linuxRoot 'runtime'
    New-Item -ItemType Directory -Path $linuxRuntime | Out-Null
    Invoke-GoBuild -TargetOS 'linux' -TargetArchitecture 'amd64' -Destination (Join-Path $linuxRuntime 'costbreakdown-linux-amd64')
    Invoke-GoBuild -TargetOS 'linux' -TargetArchitecture 'arm64' -Destination (Join-Path $linuxRuntime 'costbreakdown-linux-arm64')

    $intelMac = Join-Path $unixRuntime 'macos-amd64'
    $armMac = Join-Path $unixRuntime 'macos-arm64'
    Invoke-GoBuild -TargetOS 'darwin' -TargetArchitecture 'amd64' -Destination $intelMac
    Invoke-GoBuild -TargetOS 'darwin' -TargetArchitecture 'arm64' -Destination $armMac

    foreach ($launcherName in @('Start COSTBREAKDOWN', 'Stop COSTBREAKDOWN')) {
        $bundleRoot = Join-Path $macRoot ($launcherName + '.app')
        $contentsRoot = Join-Path $bundleRoot 'Contents'
        $macExecutableDirectory = Join-Path $contentsRoot 'MacOS'
        New-Item -ItemType Directory -Path $macExecutableDirectory -Force | Out-Null
        $bundleExecutable = Join-Path $macExecutableDirectory $launcherName
        & $nodeExecutable $combineMachOScript $intelMac $armMac $bundleExecutable
        if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $bundleExecutable -PathType Leaf)) {
            throw "Could not create the universal macOS launcher: $launcherName."
        }

        $bundleIdentifier = if ($launcherName.StartsWith('Start')) { 'com.apirak.costbreakdown.start' } else { 'com.apirak.costbreakdown.stop' }
        $plist = @"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key><string>$launcherName</string>
    <key>CFBundleIdentifier</key><string>$bundleIdentifier</string>
    <key>CFBundleName</key><string>$launcherName</string>
    <key>CFBundlePackageType</key><string>APPL</string>
    <key>CFBundleShortVersionString</key><string>1.0</string>
    <key>CFBundleVersion</key><string>1</string>
    <key>LSUIElement</key><true/>
</dict>
</plist>
"@
        Write-Utf8File -Path (Join-Path $contentsRoot 'Info.plist') -Contents $plist
    }

$linuxStart = @'
#!/bin/sh
set -eu
launcher_dir=$(CDPATH= cd "$(dirname "$0")" && pwd)
case "$(uname -m)" in
  x86_64|amd64) architecture=amd64 ;;
  aarch64|arm64) architecture=arm64 ;;
  *) printf '%s\n' 'This Linux package supports x86_64 and arm64.' >&2; exit 1 ;;
esac
exec "$launcher_dir/runtime/costbreakdown-linux-$architecture" --start "$@"
'@
    $linuxStop = $linuxStart.Replace('--start', '--stop')
    Write-Utf8File -Path (Join-Path $linuxRoot 'Start COSTBREAKDOWN') -Contents $linuxStart
    Write-Utf8File -Path (Join-Path $linuxRoot 'Stop COSTBREAKDOWN') -Contents $linuxStop

    foreach ($launcherName in @('Start COSTBREAKDOWN', 'Stop COSTBREAKDOWN')) {
        $desktop = @"
[Desktop Entry]
Type=Application
Name=$launcherName
Comment=Open or stop the local COSTBREAKDOWN app
Terminal=false
Exec=sh -c "exec \"`$(dirname \"`$1\")/$launcherName\"" sh %k
Categories=Utility;
"@
        Write-Utf8File -Path (Join-Path $linuxRoot ($launcherName + '.desktop')) -Contents $desktop
    }

    Remove-Item -LiteralPath $unixRuntime -Recurse -Force
    $workbooks = @(Get-ChildItem -LiteralPath $stageRoot -Filter '*.xlsx' -File -Recurse)
    if ($workbooks.Count -gt 0) { throw 'Portable package unexpectedly contains workbook fixtures.' }
    $appEntries = @(Get-ChildItem -LiteralPath $stageRoot -Filter 'index.html' -File -Recurse)
    if ($appEntries.Count -ne 1 -or $appEntries[0].FullName -ne (Join-Path $appRoot 'index.html')) {
        throw 'Portable package must contain exactly one shared app/index.html.'
    }

    & $nodeExecutable $zipScript $stageRoot $stageArchive
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $stageArchive -PathType Leaf)) {
        throw 'Portable package ZIP creation failed.'
    }
    & $nodeExecutable $verifyScript $stageRoot $stageArchive
    if ($LASTEXITCODE -ne 0) { throw 'Cross-platform package structure verification failed.' }

    if (Test-Path -LiteralPath $finalPackage) {
        Move-Item -LiteralPath $finalPackage -Destination $previousPackage
        $oldPackageMoved = $true
    }
    if (Test-Path -LiteralPath $finalArchive) {
        Move-Item -LiteralPath $finalArchive -Destination $previousArchive
        $oldArchiveMoved = $true
    }
    Move-Item -LiteralPath $stageRoot -Destination $finalPackage
    $packageMoved = $true
    Move-Item -LiteralPath $stageArchive -Destination $finalArchive
    $archiveMoved = $true
    $outputsReplaced = $true

    Write-Output "Portable package created: $finalPackage"
    Write-Output "Portable ZIP created: $finalArchive"
    Write-Output 'Included one shared app/ build, Windows launchers, universal macOS app bundles, and Linux x86_64/arm64 launchers.'
}
catch {
    if ($archiveMoved -and (Test-Path -LiteralPath $finalArchive)) { Remove-Item -LiteralPath $finalArchive -Force }
    if ($packageMoved -and (Test-Path -LiteralPath $finalPackage)) { Remove-Item -LiteralPath $finalPackage -Recurse -Force }
    if ($oldPackageMoved -and (Test-Path -LiteralPath $previousPackage)) { Move-Item -LiteralPath $previousPackage -Destination $finalPackage }
    if ($oldArchiveMoved -and (Test-Path -LiteralPath $previousArchive)) { Move-Item -LiteralPath $previousArchive -Destination $finalArchive }
    throw
}
finally {
    if (Test-Path -LiteralPath $stageParent) {
        $unrestoredBackup = (-not $outputsReplaced) -and (
            ($oldPackageMoved -and (Test-Path -LiteralPath $previousPackage)) -or
            ($oldArchiveMoved -and (Test-Path -LiteralPath $previousArchive))
        )
        if ($unrestoredBackup) {
            Write-Warning "A prior package backup remains at $stageParent and was preserved for recovery."
        } else {
            Remove-Item -LiteralPath $stageParent -Recurse -Force
        }
    }
}
