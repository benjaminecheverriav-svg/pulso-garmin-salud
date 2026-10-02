import { Injectable, Logger } from "@nestjs/common";
import type { Json } from "../common/util";
import { DiTokens, NATIVE_HEADERS, expiresSoon, loadTokens, saveTokens } from "./garmin-tokens";

const API = "https://connectapi.garmin.com";
const DI_TOKEN_URL = "https://diauth.garmin.com/di-oauth2-service/oauth/token";
const PAUSE_MS = 350; // pausa entre llamadas para no saturar a Garmin

export type Params = Record<string, string | number | boolean>;

/** Cliente HTTP de Garmin Connect con renovación automática del token. */
@Injectable()
export class GarminHttpService {
  private readonly log = new Logger("Garmin");
  private tokens: DiTokens | null = loadTokens();
  displayName: string | null = null;
  fullName: string | null = null;

  get hasTokens(): boolean {
    return this.tokens !== null;
  }

  reloadTokens(): void {
    this.tokens = loadTokens();
    this.displayName = null;
  }

  clear(): void {
    this.tokens = null;
    this.displayName = null;
    this.fullName = null;
  }

  /** Renueva el token de acceso con el refresh token (no necesita contraseña). */
  async refresh(): Promise<void> {
    const t = this.tokens;
    if (!t) throw new Error("No hay sesión de Garmin");
    const res = await fetch(DI_TOKEN_URL, {
      method: "POST",
      headers: {
        ...NATIVE_HEADERS,
        Authorization: "Basic " + Buffer.from(`${t.di_client_id}:`).toString("base64"),
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
      body: new URLSearchParams({ grant_type: "refresh_token", client_id: t.di_client_id, refresh_token: t.di_refresh_token }),
    });
    if (!res.ok) throw new Error(`No se pudo renovar la sesión (${res.status})`);
    const data = (await res.json()) as { access_token: string; refresh_token?: string };
    this.tokens = { ...t, di_token: data.access_token, di_refresh_token: data.refresh_token ?? t.di_refresh_token };
    saveTokens(this.tokens);
    this.log.log("Token de Garmin renovado");
  }

  /** Carga el perfil (displayName) que necesitan varios endpoints. */
  async ensureProfile(): Promise<void> {
    if (this.displayName) return;
    const prof = await this.get("/userprofile-service/socialProfile");
    this.displayName = prof?.displayName ?? null;
    this.fullName = prof?.fullName ?? null;
  }

  async get(path: string, params: Params = {}): Promise<Json> {
    if (!this.tokens) throw new Error("No hay sesión de Garmin");
    if (expiresSoon(this.tokens.di_token)) await this.refresh();
    const qs = new URLSearchParams(Object.entries(params).map(([k, v]): [string, string] => [k, String(v)])).toString();
    const url = `${API}${path}${qs ? (path.includes("?") ? "&" : "?") + qs : ""}`;
    let res = await this.fetchOnce(url);
    if (res.status === 401) {
      await this.refresh();
      res = await this.fetchOnce(url);
    }
    if (res.status === 204) return {};
    if (!res.ok) throw new Error(`Garmin ${res.status} en ${path}`);
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  }

  /** Igual que get(), pero devuelve null si falla (para la sincronización). */
  async tryGet(path: string, params: Params = {}): Promise<Json> {
    try {
      return await this.get(path, params);
    } catch (e) {
      this.log.debug(`${path} falló: ${(e as Error).message}`);
      return null;
    } finally {
      await new Promise((r) => setTimeout(r, PAUSE_MS));
    }
  }

  private fetchOnce(url: string): Promise<Response> {
    return fetch(url, {
      headers: { ...NATIVE_HEADERS, Authorization: `Bearer ${this.tokens!.di_token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(20_000),
    });
  }
}
