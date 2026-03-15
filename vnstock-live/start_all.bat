@echo off
echo Starting VNStock Live...
cd /d C:\Users\Lenovo\dotplot\stockplot\vnstock-live
start "VNStock-Dev" cmd /k "npm run dev"

echo Starting Worker...
cd /d C:\Users\Lenovo\dotplot\stockplot
start "VNStock-Worker" cmd /k ".venv\Scripts\python vnstock-live/worker/stock_updater.py"

echo Starting Telegram Bot...
start "VNStock-TelegramBot" cmd /k ".venv\Scripts\python vnstock-live/worker/telegram_bot.py"

echo All services started!
