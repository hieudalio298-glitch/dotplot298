@echo off
set "PROJECT_DIR=%~dp0.."
cd "%PROJECT_DIR%"

echo [1/3] Activating venv...
if exist .venv (
    call .venv\Scripts\activate
) else (
    if exist venv (
        call venv\Scripts\activate
    ) else (
        echo [ERROR] Virtual environment '.venv' or 'venv' not found.
        pause
        exit /b 1
    )
)

echo [2/3] Installing pywin32...
pip install pywin32

echo [3/3] Installing Service...
python scripts\run_scheduler.py install

echo Starting Service...
python scripts\run_scheduler.py start

echo.
echo ===================================================
echo Service Installed Successfully!
echo You can check logs in: %PROJECT_DIR%\scripts\scheduler.log
echo To stop service: python scripts\run_scheduler.py stop
echo ===================================================
pause
