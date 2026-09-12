@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "PORT=5173"
set "NODE="

where node >nul 2>nul
if not errorlevel 1 set "NODE=node"

if not defined NODE if exist "F:\zxc\nodejs\node.exe" set "NODE=F:\zxc\nodejs\node.exe"
if not defined NODE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "NODE=%LOCALAPPDATA%\Programs\nodejs\node.exe"

if not defined NODE (
  echo [ERROR] Node.js not found.
  pause
  exit /b 1
)

if not exist "scripts\serve.cjs" (
  echo [ERROR] scripts\serve.cjs not found in %CD%
  pause
  exit /b 1
)

echo ChaosVault
echo URL:  http://127.0.0.1:%PORT%/
echo Stop: close this window, or run stop.bat
echo.
"%NODE%" "scripts\serve.cjs" %PORT%
