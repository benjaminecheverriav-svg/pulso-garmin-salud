import { ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { LOGIN_SCRIPT, TOKEN_DIR, env } from "../config/paths";

export type LoginEvent = { status: "ok" } | { status: "mfa" } | { status: "error"; message: string };

const FRIENDLY: Record<string, string> = {
  rate_limited:
    "Garmin bloqueó temporalmente los inicios de sesión desde tu conexión por demasiados intentos. Espera 30–60 minutos y vuelve a intentarlo.",
};

/**
 * Ejecuta el puente de Python (tools/garmin-login/login.py) que hace el inicio
 * de sesión con contraseña y, si Garmin lo pide, el código de verificación (MFA).
 */
export class PythonLogin {
  private child: ChildProcessWithoutNullStreams | null = null;
  private waiters: ((e: LoginEvent) => void)[] = [];

  start(email: string, password: string): Promise<LoginEvent> {
    this.kill();
    const child = spawn(env.python, [LOGIN_SCRIPT, TOKEN_DIR], {
      env: { ...process.env, PULSO_LOGIN_EMAIL: email, PULSO_LOGIN_PASSWORD: password, PYTHONIOENCODING: "utf-8" },
    });
    this.child = child;
    createInterface({ input: child.stdout }).on("line", (line) => this.onLine(line));
    child.on("error", () => this.resolve({ status: "error", message: "No se encontró Python. Instálalo para iniciar sesión en Garmin." }));
    child.on("exit", (code) => code && this.resolve({ status: "error", message: "El inicio de sesión terminó con un error." }));
    return this.next();
  }

  submitMfa(code: string): Promise<LoginEvent> {
    if (!this.child) return Promise.resolve({ status: "error", message: "No hay un inicio de sesión pendiente." });
    const p = this.next();
    this.child.stdin.write(code.trim() + "\n");
    return p;
  }

  kill(): void {
    this.child?.kill();
    this.child = null;
  }

  private next(): Promise<LoginEvent> {
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  private onLine(line: string): void {
    try {
      const e = JSON.parse(line) as LoginEvent;
      if (e.status === "error") e.message = FRIENDLY[e.message] ?? e.message;
      this.resolve(e);
    } catch {
      /* línea que no es del protocolo */
    }
  }

  private resolve(e: LoginEvent): void {
    const w = this.waiters.shift();
    if (w) w(e);
    if (e.status !== "mfa") this.child = null;
  }
}
