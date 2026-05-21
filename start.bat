@echo off
cd /d "%~dp0"
node_modules\electron\dist\electron.exe .
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo App exited with error code %ERRORLEVEL%
  pause
)
