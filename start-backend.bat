@echo off
title Souq Cars - Backend Server
cd /d "%~dp0"
echo Starting the Souq Cars backend server...
echo (Leave this window open while using the app. Closing it stops the server.)
echo.
call npm run dev
echo.
echo The server has stopped. Press any key to close this window.
pause >nul
