@echo off
cd /d "%~dp0.."
node server\check-status.js
echo.
pause
