@echo off
chcp 65001 >nul
title Pulso - Salud y rendimiento
cd /d "%~dp0"
set NEXT_TELEMETRY_DISABLED=1
echo.
echo  ===== Pulso: salud y rendimiento =====
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo  [ERROR] No se encontro Node.js. Instala la version LTS desde https://nodejs.org
  pause
  exit /b 1
)

echo  [1/4] Revisando dependencias de Node...
call npm install --no-audit --no-fund --loglevel=error
if errorlevel 1 (
  echo  [ERROR] No se pudieron instalar las dependencias. Revisa tu conexion a internet.
  pause
  exit /b 1
)

echo  [2/4] Revisando el puente de inicio de sesion de Garmin (Python)...
where python >nul 2>nul
if errorlevel 1 (
  echo         Aviso: sin Python no podras iniciar sesion en Garmin por primera vez.
  echo         Si ya tienes la sesion guardada, la app funciona igual.
) else (
  python -m pip install -q --disable-pip-version-check -r tools\garmin-login\requirements.txt
)

echo  [3/4] Compilando la app (solo la primera vez o tras actualizar el codigo)...
if not exist apps\api\dist\main.js goto build
if not exist apps\web\.next\BUILD_ID goto build
for /f %%i in ('git rev-parse HEAD 2^>nul') do set HEAD=%%i
set /p BUILT=<.build-version 2>nul
if not "%HEAD%"=="%BUILT%" goto build
goto run

:build
call npm run build
if errorlevel 1 (
  echo  [ERROR] La compilacion fallo. Copia el error de arriba y compartelo.
  pause
  exit /b 1
)
for /f %%i in ('git rev-parse HEAD 2^>nul') do echo %%i>.build-version

:run
echo  [4/4] Abriendo http://localhost:3000 - NO cierres esta ventana mientras uses la app.
echo.
start "" cmd /c "timeout /t 6 >nul & start http://localhost:3000"
call npm run start
echo.
echo  La app se detuvo. Si ves un error arriba, copialo y compartelo.
pause
