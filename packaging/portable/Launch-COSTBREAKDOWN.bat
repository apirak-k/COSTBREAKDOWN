@echo off
setlocal
set "SERVER_ARGS="
if /I "%~1"=="--no-browser" set "SERVER_ARGS=-NoBrowser"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Serve-COSTBREAKDOWN.ps1" %SERVER_ARGS%
exit /b %ERRORLEVEL%
