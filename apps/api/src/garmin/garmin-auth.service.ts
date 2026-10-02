import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import type { Status } from "@pulso/shared";
import { env } from "../config/paths";
import { GarminHttpService } from "./garmin-http.service";
import { deleteTokens } from "./garmin-tokens";
import { PythonLogin } from "./python-login";

type LoginState = Status["login"];

/** Estado de la sesión de Garmin: reutiliza tokens o inicia sesión vía el puente de Python. */
@Injectable()
export class GarminAuthService implements OnApplicationBootstrap {
  private readonly log = new Logger("GarminAuth");
  private readonly python = new PythonLogin();
  state: LoginState = { status: "idle", error: null };

  constructor(private readonly http: GarminHttpService) {}

  get connected(): boolean {
    return this.http.hasTokens && this.http.displayName !== null;
  }

  profile(): Status["profile"] {
    return { name: this.http.fullName || this.http.displayName, displayName: this.http.displayName };
  }

  /** Al arrancar: en segundo plano, para que la web abra al instante. */
  onApplicationBootstrap(): void {
    void this.autoLogin();
  }

  private async autoLogin(): Promise<void> {
    this.state = { status: "logging_in", error: null };
    if (await this.resume()) return;
    if (env.garminEmail && env.garminPassword) {
      const r = await this.login(env.garminEmail, env.garminPassword).catch((e: Error) => e.message);
      if (r === "mfa") this.state = { status: "mfa", error: null };
      return;
    }
    this.state = { status: "idle", error: null };
  }

  /** Reutiliza los tokens guardados (renovándolos si hace falta). */
  async resume(): Promise<boolean> {
    if (!this.http.hasTokens) return false;
    try {
      await this.http.ensureProfile();
      this.state = { status: "ok", error: null };
      this.log.log("Sesión de Garmin restaurada");
      return true;
    } catch (e) {
      this.log.warn(`No se pudo restaurar la sesión: ${(e as Error).message}`);
      return false;
    }
  }

  async login(email: string, password: string): Promise<"ok" | "mfa"> {
    this.state = { status: "logging_in", error: null };
    const ev = await this.python.start(email, password);
    return this.finish(ev);
  }

  async submitMfa(code: string): Promise<"ok" | "mfa"> {
    return this.finish(await this.python.submitMfa(code));
  }

  private async finish(ev: Awaited<ReturnType<PythonLogin["start"]>>): Promise<"ok" | "mfa"> {
    if (ev.status === "mfa") {
      this.state = { status: "mfa", error: null };
      return "mfa";
    }
    if (ev.status === "error") {
      this.state = { status: "error", error: ev.message };
      throw new Error(ev.message);
    }
    this.http.reloadTokens();
    await this.resume();
    return "ok";
  }

  logout(): void {
    this.python.kill();
    deleteTokens();
    this.http.clear();
    this.state = { status: "idle", error: null };
  }
}
