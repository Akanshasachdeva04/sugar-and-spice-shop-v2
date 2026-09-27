@echo off
cd /d "%~dp0"

if not exist node_modules (
    echo Setting up storefront for the first time, this may take a minute...
    call npm install
)
if not exist .env copy .env.example .env

echo.
echo Starting storefront at http://localhost:5173
echo.
call npm run dev
pause
