@echo off
chcp 65001 >nul

:: Chuyen huong ve thu muc goc chua code Python
cd /d "C:\Users\Lenovo\dotplot\stockplot\"

echo ========================================================
echo       KHOI NGOAI MUA BAN RONG - FOREIGN TRADE CHART
echo ========================================================
echo.
echo Dang tai du lieu va tao bieu do khối ngoại...
echo Lần đầu có thể mất vài phút do rate limit, sau đó sẽ dùng Cache.
echo.

.\.venv\Scripts\python.exe vnindex_foreign_trade.py

echo.
echo ========================================================
echo Thanh cong! Dang tu dong mo bieu do tren trinh duyet...
echo ========================================================

start vnindex_foreign_trade.html

echo.
echo Bam phim bat ky de dong cua so nay.
pause >nul
