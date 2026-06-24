@echo off
echo ===================================
echo  3DimM - Установка зависимостей
echo ===================================
echo.

echo [1/4] Установка Node.js зависимостей...
call npm install:all
if %errorlevel% neq 0 (
    echo ОШИБКА: Не удалось установить Node.js зависимости
    pause
    exit /b 1
)

echo.
echo [2/4] Установка yt-dlp...
pip install -U yt-dlp
if %errorlevel% neq 0 (
    echo ОШИБКА: Не удалось установить yt-dlp
    echo Убедитесь, что Python и pip установлены
    pause
    exit /b 1
)

echo.
echo [3/4] Установка плагинов для YouTube...
pip install bgutil-ytdlp-pot-provider yt-dlp-getpot-wpc yt-dlp-ejs
if %errorlevel% neq 0 (
    echo ПРЕДУПРЕЖДЕНИЕ: Некоторые плагины не установлены
    echo YouTube может работать с ограничениями
)

echo.
echo [4/4] Проверка установки...
yt-dlp --version
echo.

echo ===================================
echo  Установка завершена!
echo ===================================
echo.
echo Плагины YouTube:
echo   - bgutil-ytdlp-pot-provider (PO Token)
echo   - yt-dlp-getpot-wpc (fallback)
echo.
echo Для скачивания age-restricted видео:
echo   Экспортируйте cookies из браузера
echo   (см. README - секция YouTube cookies)
echo.
echo Для запуска: npm run dev
echo Для Electron: npm run dev:electron
echo.
pause
