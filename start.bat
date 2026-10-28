@echo off
REM Stoockroom - run locally and install as an app (Windows)
REM Double-click this file, or run: start.bat
cd /d "%~dp0"

set PORT=5173
if not "%~1"=="" set PORT=%~1

where python >nul 2>nul
if %errorlevel%==0 (
  set PY=python
) else (
  where py >nul 2>nul
  if %errorlevel%==0 (
    set PY=py
  ) else (
    echo Python not found. Install Python 3 first: https://www.python.org/downloads/
    echo During setup, tick "Add Python to PATH".
    pause
    exit /b 1
  )
)

echo.
echo   Stoockroom  -^>  http://localhost:%PORT%
echo   To install as an app: use the install icon in the address bar,
echo   or the "Install app" button at the top right of the page.
echo   Press Ctrl + C to stop.
echo.

start "" "http://localhost:%PORT%"
%PY% serve.py %PORT%
pause
