import { config } from "dotenv";
import { join, resolve } from "node:path";

/** Raíz del monorepo (apps/api/dist/config → ../../../..). */
export const ROOT = resolve(__dirname, "..", "..", "..", "..");
export const DATA_DIR = join(ROOT, "data");
export const DB_PATH = join(DATA_DIR, "garmin.db");
export const TOKEN_DIR = join(DATA_DIR, "garmin_tokens");
export const TOKEN_FILE = join(TOKEN_DIR, "garmin_tokens.json");
export const LOGIN_SCRIPT = join(ROOT, "tools", "garmin-login", "login.py");

config({ path: join(ROOT, ".env"), quiet: true });

export const env = {
  garminEmail: process.env.GARMIN_EMAIL || "",
  garminPassword: process.env.GARMIN_PASSWORD || "",
  anthropicKey: process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || "",
  python: process.env.PYTHON || "python",
  port: Number(process.env.API_PORT || 8765),
};
