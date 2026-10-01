@echo off
setlocal
cd /d "%~dp0.."

if not exist "server\.env" (
  echo.
  echo ERROR: server\.env not found.
  echo Copy server\.env.example to server\.env and fill in ANTHROPIC_API_KEY and VOYAGE_API_KEY first.
  echo.
  pause
  exit /b 1
)

echo Starting book indexing. This can safely be stopped (Ctrl+C or close this window)
echo and resumed later by running this file again.
echo.
node server\build-index.js %*

echo.
echo ------------------------------------------------------------
echo Finished (or stopped). Run check-status.bat any time for a progress summary.
pause
