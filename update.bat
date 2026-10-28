@echo off
REM Stoockroom - pull the latest changes from GitHub and restart the app
REM Double-click this file, or run: update.bat [port]
cd /d "%~dp0"

set BRANCH=arena/20252ded-stoockroom

where git >nul 2>nul
if not %errorlevel%==0 (
  echo Git not found. Install it first: https://git-scm.com/downloads
  pause
  exit /b 1
)

echo.
echo   Pulling latest changes from GitHub ^(branch %BRANCH%^)...
echo.
git pull --ff-only origin %BRANCH%
if errorlevel 1 (
  echo.
  echo   Update failed. Check your internet connection or local changes.
  pause
  exit /b 1
)

echo.
echo   Restarting the app...
echo.
call "%~dp0start.bat" %1
