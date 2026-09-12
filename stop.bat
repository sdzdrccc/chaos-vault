@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "PORT=5173"
set "FOUND="

for /f "tokens=5" %%P in ('netstat -ano ^| findstr "LISTENING" ^| findstr ":%PORT%"') do (
  taskkill /F /PID %%P >nul 2>nul
  if not errorlevel 1 (
    set "FOUND=1"
    echo Stopped PID %%P on port %PORT%
  )
)

if not defined FOUND (
  echo No process is listening on port %PORT%.
) else (
  echo ChaosVault server stopped.
)

pause
