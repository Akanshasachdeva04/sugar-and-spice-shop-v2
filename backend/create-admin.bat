@echo off
cd /d "%~dp0"

if not exist venv (
    echo Backend hasn't been set up yet — run start.bat first, then come back to this.
    pause
    exit /b
)

call venv\Scripts\activate.bat
echo Creating your admin account — fill in the details below:
echo.
python seed_admin.py
pause
