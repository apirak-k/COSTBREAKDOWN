$ErrorActionPreference = 'Stop'

$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$releaseRoot = Join-Path $repositoryRoot 'release'
$packageRoot = Join-Path $releaseRoot 'COSTBREAKDOWN-portable'
$distRoot = Join-Path $repositoryRoot 'dist'
$portableSources = Join-Path $repositoryRoot 'packaging\portable'

if (Test-Path -LiteralPath $packageRoot) {
    throw "Portable output already exists: $packageRoot. Move it aside before building a fresh package."
}

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

New-Item -ItemType Directory -Path $packageRoot -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $distRoot 'index.html') -Destination $packageRoot
Copy-Item -LiteralPath (Join-Path $distRoot 'assets') -Destination $packageRoot -Recurse
Copy-Item -LiteralPath (Join-Path $portableSources 'Launch-COSTBREAKDOWN.bat') -Destination $packageRoot
Copy-Item -LiteralPath (Join-Path $portableSources 'Serve-COSTBREAKDOWN.ps1') -Destination $packageRoot
Copy-Item -LiteralPath (Join-Path $portableSources 'README.md') -Destination $packageRoot

$workbooks = @(Get-ChildItem -LiteralPath $packageRoot -Filter '*.xlsx' -File -Recurse)
if ($workbooks.Count -gt 0) {
    throw 'Portable package unexpectedly contains workbook fixtures.'
}

Write-Output "Portable package created: $packageRoot"
Write-Output 'Included: index.html, assets/, Launch-COSTBREAKDOWN.bat, Serve-COSTBREAKDOWN.ps1, README.md'
