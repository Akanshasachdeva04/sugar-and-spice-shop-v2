@echo off
cd /d "%~dp0"

echo ============================================
echo  Sugar and Spice — starting everything
echo ============================================
echo.
echo This will open 3 windows: backend, storefront, and admin panel.
echo Keep all 3 windows open while you're using the site.
echo.
echo First time running this? Each window will install what it
echo needs automatically — that can take a few minutes. Just wait.
echo.
pause

start "Backend (port 8000)" cmd /k "cd /d "%~dp0backend" && start.bat"
timeout /t 5 /nobreak >nul

start "Storefront (port 5173)" cmd /k "cd /d "%~dp0storefront" && start.bat"
timeout /t 2 /nobreak >nul

start "Admin Panel" cmd /k "cd /d "%~dp0admin" && start.bat"

echo.
echo All 3 windows launching. Once the backend window shows
echo "Uvicorn running on http://127.0.0.1:8000", the site is ready.
echo.
echo Admin login is created automatically on first start:
echo   Email: meenutandon@gmail.com
echo   Password: meenu123@
echo Admin panel: http://localhost:5174
echo.
pause
