@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================================
echo       DANH GIA THI TRUONG - VNINDEX BUBBLE CHART
echo ========================================================
echo.
echo Dang tai du lieu va tao bieu do (co the mat vai giay den 5 phut neu chua co Cache)...
echo.

.\.venv\Scripts\python.exe vnindex_bubble_chart.py

echo.
echo ========================================================
echo Thanh cong! Dang tu dong mo bieu do tren trinh duyet...
echo ========================================================

start vnindex_bubble_chart.html

echo.
echo Bam phim bat ky de dong cua so nay.
pause >nul
