@echo off
chcp 65001 >nul
title Pulso - Salud y rendimiento
cd /d "%~dp0"
echo.
echo  ===== Pulso: salud y rendimiento =====
echo.
where python >nul 2>nul
if errorlevel 1 (
  echo  [ERROR] No se encontro Python. Instalalo desde https://www.python.org/downloads/
  echo          y marca la casilla "Add python.exe to PATH" durante la instalacion.
  pause
  exit /b 1
)
echo  [1/3] Revisando dependencias...
python -m pip install -q --disable-pip-version-check -r requirements.txt
if errorlevel 1 (
  echo  [ERROR] No se pudieron instalar las dependencias. Revisa tu conexion a internet.
  pause
  exit /b 1
)
echo  [2/3] Abriendo el navegador en http://localhost:8765
start "" http://localhost:8765
echo  [3/3] Servidor en marcha. NO cierres esta ventana mientras uses la app.
echo.
python -m uvicorn backend.app:app --port 8765
echo.
echo  El servidor se detuvo. Si ves un error arriba, copialo y compartelo.
pause
