@echo off
cd /d "%~dp0"

if not exist node_modules (
    echo Setting up admin panel for the first time, this may take a minute...
    call npm install
)
if not exist .env copy .env.example .env

echo.
echo Starting admin panel — check the URL below (usually http://localhost:5174)
echo.
call npm run dev
pause
