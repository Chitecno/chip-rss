@echo off
rem Prende chip-rss y abre el navegador. Se usa con doble clic (o desde el ícono del escritorio).
rem Mientras esta ventana esté abierta, la app funciona. Para apagarla, cerrá la ventana.
title chip-rss
cd /d "%~dp0.."

rem Si la app ya está prendida, solo abrimos el navegador.
curl.exe -s -o nul --max-time 2 http://localhost:4173/ && (
  start "" http://localhost:4173/
  exit /b
)

echo.
echo   chip-rss se esta prendiendo...
echo   Cuando este lista se abre sola en el navegador.
echo   No cierres esta ventana mientras uses la app. Para apagarla, cerrala.
echo.

rem Abre el navegador apenas la app responde (espera hasta un minuto).
start "" /min powershell -NoProfile -WindowStyle Hidden -Command "for ($i = 0; $i -lt 60; $i++) { try { Invoke-WebRequest 'http://localhost:4173/' -UseBasicParsing -TimeoutSec 1 | Out-Null; Start-Process 'http://localhost:4173/'; break } catch { Start-Sleep 1 } }"

call npm.cmd run app
