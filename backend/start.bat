@echo off
cd /d "%~dp0"

if not exist venv (
    echo Setting up backend for the first time, this may take a minute...
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
    if not exist .env copy .env.example .env
) else (
    call venv\Scripts\activate.bat
)

echo.
echo Starting backend at http://localhost:8000
echo API docs at http://localhost:8000/docs
echo.
python -m uvicorn app.main:app --reload --port 8000
pause
