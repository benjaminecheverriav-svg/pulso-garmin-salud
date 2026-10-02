import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { TOKEN_DIR, TOKEN_FILE } from "../config/paths";

/** Tokens "DI" de Garmin (mismo formato que guarda la librería garminconnect de Python). */
export interface DiTokens {
  di_token: string;
  di_refresh_token: string;
  di_client_id: string;
}

export function loadTokens(): DiTokens | null {
  if (!existsSync(TOKEN_FILE)) return null;
  try {
    const t = JSON.parse(readFileSync(TOKEN_FILE, "utf8")) as Partial<DiTokens>;
    return t.di_token && t.di_refresh_token && t.di_client_id ? (t as DiTokens) : null;
  } catch {
    return null;
  }
}

export function saveTokens(t: DiTokens): void {
  mkdirSync(TOKEN_DIR, { recursive: true });
  writeFileSync(TOKEN_FILE, JSON.stringify(t));
}

export function deleteTokens(): void {
  if (existsSync(TOKEN_DIR)) rmSync(TOKEN_DIR, { recursive: true, force: true });
}

/** true si el JWT caduca en menos de 15 minutos. */
export function expiresSoon(token: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return typeof payload.exp === "number" && Date.now() / 1000 > payload.exp - 900;
  } catch {
    return false;
  }
}

/** Cabeceras de la app Android oficial: Garmin rechaza clientes "desconocidos". */
export const NATIVE_HEADERS: Record<string, string> = {
  "User-Agent": "GCM-Android-5.23",
  "X-Garmin-User-Agent":
    "com.garmin.android.apps.connectmobile/5.23; ; Google/sdk_gphone64_arm64/google; Android/33; Dalvik/2.1.0",
  "X-Garmin-Paired-App-Version": "10861",
  "X-Garmin-Client-Platform": "Android",
  "X-App-Ver": "10861",
  "X-Lang": "en",
  "X-GCExperience": "GC5",
  "Accept-Language": "en-US,en;q=0.9",
};
