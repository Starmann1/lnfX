@echo off
title Hostel Lost & Found Portal - PHP & MySQL Server
echo ========================================================
echo   Hostel Lost ^& Found Portal
echo   Full Stack: React 18 + PHP 8.3 + MySQL 8.0
echo ========================================================
echo.

set PHP_EXE=php
where php >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    set PHP_EXE="%LOCALAPPDATA%\Microsoft\WinGet\Packages\PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe\php.exe"
)

echo Starting PHP built-in web server at: http://localhost:8000
echo Opening web browser...
start http://localhost:8000
echo.
echo Server is running! Press Ctrl+C in this window to stop the server.
echo.
%PHP_EXE% -S localhost:8000
pause
