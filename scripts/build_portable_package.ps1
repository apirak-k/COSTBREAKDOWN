param(
    [switch]$Rebuild
)

$ErrorActionPreference = 'Stop'

$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$releaseRoot = [System.IO.Path]::GetFullPath((Join-Path $repositoryRoot 'release'))
$packageRoot = [System.IO.Path]::GetFullPath((Join-Path $releaseRoot 'COSTBREAKDOWN-portable'))
$distRoot = [System.IO.Path]::GetFullPath((Join-Path $repositoryRoot 'dist'))
$portableSources = [System.IO.Path]::GetFullPath((Join-Path $repositoryRoot 'packaging\portable'))
$launcherSource = Join-Path $portableSources 'PortableLauncher.cs'
$serverSource = Join-Path $portableSources 'Serve-COSTBREAKDOWN.ps1'
$readmeSource = Join-Path $portableSources 'README.md'

function Assert-ReleaseChild {
    param([string]$Path)

    $releasePrefix = $releaseRoot.TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
    $fullPath = [System.IO.Path]::GetFullPath($Path)
    if (-not $fullPath.StartsWith($releasePrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to modify a path outside the release folder: $fullPath"
    }
    return $fullPath
}

function Remove-ReleaseChild {
    param([string]$Path)

    $verifiedPath = Assert-ReleaseChild -Path $Path
    if (Test-Path -LiteralPath $verifiedPath) {
        Remove-Item -LiteralPath $verifiedPath -Recurse -Force
    }
}

if ((Test-Path -LiteralPath $packageRoot) -and -not $Rebuild) {
    throw "Portable output already exists: $packageRoot. Use -Rebuild to create and validate a fresh package before replacing it."
}

foreach ($requiredSource in @($launcherSource, $serverSource, $readmeSource)) {
    if (-not (Test-Path -LiteralPath $requiredSource -PathType Leaf)) {
        throw "Required portable source file is missing: $requiredSource"
    }
}

New-Item -ItemType Directory -Path $releaseRoot -Force | Out-Null
$releaseRoot = [System.IO.Path]::GetFullPath($releaseRoot)
$stageRoot = Assert-ReleaseChild -Path (Join-Path $releaseRoot ('.COSTBREAKDOWN-portable-staging-' + [guid]::NewGuid().ToString('N')))
$backupRoot = $null

try {
    Push-Location $repositoryRoot
    try {
        & npm.cmd run build
        if ($LASTEXITCODE -ne 0) {
            throw "npm run build failed with exit code $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }

    if (-not (Test-Path -LiteralPath (Join-Path $distRoot 'index.html') -PathType Leaf)) {
        throw 'Build output is missing dist/index.html.'
    }
    if (-not (Test-Path -LiteralPath (Join-Path $distRoot 'assets') -PathType Container)) {
        throw 'Build output is missing dist/assets.'
    }

    $compilerCandidates = @(
        (Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'),
        (Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe')
    )
    $compiler = $compilerCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
    if (-not $compiler) {
        throw 'Windows .NET Framework C# compiler was not found. It is required only on the build computer.'
    }

    New-Item -ItemType Directory -Path $stageRoot | Out-Null
    Copy-Item -LiteralPath (Join-Path $distRoot 'index.html') -Destination $stageRoot
    Copy-Item -LiteralPath (Join-Path $distRoot 'assets') -Destination $stageRoot -Recurse
    Copy-Item -LiteralPath $serverSource -Destination $stageRoot
    Copy-Item -LiteralPath $readmeSource -Destination $stageRoot

    $startLauncher = Join-Path $stageRoot 'Start COSTBREAKDOWN.exe'
    & $compiler '/nologo' '/target:winexe' '/optimize+' ("/out:$startLauncher") $launcherSource
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $startLauncher -PathType Leaf)) {
        throw "Could not compile the silent portable launcher (exit code $LASTEXITCODE)."
    }
    Copy-Item -LiteralPath $startLauncher -Destination (Join-Path $stageRoot 'Stop COSTBREAKDOWN.exe')

    $workbooks = @(Get-ChildItem -LiteralPath $stageRoot -Filter '*.xlsx' -File -Recurse)
    if ($workbooks.Count -gt 0) {
        throw 'Portable package unexpectedly contains workbook fixtures.'
    }

    $expectedRootFiles = @('README.md', 'Serve-COSTBREAKDOWN.ps1', 'Start COSTBREAKDOWN.exe', 'Stop COSTBREAKDOWN.exe', 'index.html')
    $actualRootFiles = @(Get-ChildItem -LiteralPath $stageRoot -File | ForEach-Object Name | Sort-Object)
    $expectedRootFiles = @($expectedRootFiles | Sort-Object)
    if (Compare-Object -ReferenceObject $expectedRootFiles -DifferenceObject $actualRootFiles) {
        throw 'Portable staging folder contains an unexpected or missing root file.'
    }
    if (-not (Test-Path -LiteralPath (Join-Path $stageRoot 'assets') -PathType Container)) {
        throw 'Portable staging folder is missing assets/.'
    }

    if (Test-Path -LiteralPath $packageRoot) {
        $backupRoot = Assert-ReleaseChild -Path (Join-Path $releaseRoot ('.COSTBREAKDOWN-portable-backup-' + [guid]::NewGuid().ToString('N')))
        Move-Item -LiteralPath $packageRoot -Destination $backupRoot
        try {
            Move-Item -LiteralPath $stageRoot -Destination $packageRoot
        }
        catch {
            if (-not (Test-Path -LiteralPath $packageRoot) -and (Test-Path -LiteralPath $backupRoot)) {
                Move-Item -LiteralPath $backupRoot -Destination $packageRoot
                $backupRoot = $null
            }
            throw
        }
        Remove-ReleaseChild -Path $backupRoot
        $backupRoot = $null
    } else {
        Move-Item -LiteralPath $stageRoot -Destination $packageRoot
    }

    Write-Output "Portable package created: $packageRoot"
    Write-Output 'Included: Start COSTBREAKDOWN.exe, Stop COSTBREAKDOWN.exe, index.html, assets/, Serve-COSTBREAKDOWN.ps1, README.md'
}
finally {
    if (Test-Path -LiteralPath $stageRoot) { Remove-ReleaseChild -Path $stageRoot }
    if ($backupRoot -and (Test-Path -LiteralPath $backupRoot) -and -not (Test-Path -LiteralPath $packageRoot)) {
        Move-Item -LiteralPath $backupRoot -Destination $packageRoot
    }
}
