"""Puente de inicio de sesión en Garmin Connect.

Es la única pieza en Python del proyecto. Garmin bloquea los inicios de sesión
de clientes que no imitan a la app oficial; la librería `garminconnect` lo
resuelve con varias estrategias (incluida la imitación TLS con curl_cffi) que
no existen en Node. El backend NestJS ejecuta este script solo cuando no hay
una sesión válida; todo lo demás (renovar tokens, descargar datos) es TypeScript.

Protocolo (una línea JSON por evento en stdout):
  {"status": "mfa"}            → espera el código de verificación por stdin
  {"status": "ok"}             → tokens guardados en <token_dir>
  {"status": "error", ...}     → fallo (rate_limited, credenciales, etc.)

Las credenciales llegan por variables de entorno, nunca por argumentos.
"""
import json
import os
import sys

from garminconnect import Garmin


def emit(status: str, **extra: str) -> None:
    print(json.dumps({"status": status, **extra}), flush=True)


def main() -> int:
    token_dir = sys.argv[1]
    email = os.environ.get("PULSO_LOGIN_EMAIL", "")
    password = os.environ.get("PULSO_LOGIN_PASSWORD", "")
    try:
        api = Garmin(email, password, return_on_mfa=True)
        status, _ = api.login()
        if status == "needs_mfa":
            emit("mfa")
            code = sys.stdin.readline().strip()
            api.resume_login(None, code)
        os.makedirs(token_dir, exist_ok=True)
        api.client.dump(token_dir)
        emit("ok")
        return 0
    except Exception as e:  # el mensaje se traduce en el backend
        message = str(e)
        if "429" in message or "rate" in message.lower():
            message = "rate_limited"
        emit("error", message=message)
        return 1


if __name__ == "__main__":
    sys.exit(main())
