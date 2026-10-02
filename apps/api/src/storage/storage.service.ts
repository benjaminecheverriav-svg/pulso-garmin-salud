import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { mkdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { DATA_DIR, DB_PATH } from "../config/paths";
import type { Json } from "../common/util";

/** Caché local en SQLite con las respuestas crudas de Garmin (mismo esquema que la versión Python). */
@Injectable()
export class StorageService implements OnModuleDestroy {
  private readonly db: DatabaseSync;

  constructor() {
    mkdirSync(DATA_DIR, { recursive: true });
    this.db = new DatabaseSync(DB_PATH);
    for (const table of ["days (date", "globals (key", "activity_details (id"]) {
      this.db.exec(`CREATE TABLE IF NOT EXISTS ${table} TEXT PRIMARY KEY, raw TEXT NOT NULL, fetched_at TEXT NOT NULL)`);
    }
  }

  onModuleDestroy(): void {
    this.db.close();
  }

  /** Hora local "AAAA-MM-DDTHH:MM:SS" (mismo formato que guardaba la versión Python). */
  private now(): string {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
  }

  saveDay(date: string, raw: Json): void {
    this.db.prepare("INSERT OR REPLACE INTO days VALUES (?, ?, ?)").run(date, JSON.stringify(raw), this.now());
  }

  hasDay(date: string): boolean {
    return !!this.db.prepare("SELECT 1 FROM days WHERE date = ?").get(date);
  }

  loadDays(): Record<string, Json> {
    const rows = this.db.prepare("SELECT date, raw FROM days ORDER BY date").all() as { date: string; raw: string }[];
    return Object.fromEntries(rows.map((r) => [r.date, JSON.parse(r.raw)]));
  }

  saveGlobal(key: string, raw: Json): void {
    this.db.prepare("INSERT OR REPLACE INTO globals VALUES (?, ?, ?)").run(key, JSON.stringify(raw ?? null), this.now());
  }

  loadGlobal<T = Json>(key: string): T | null {
    const row = this.db.prepare("SELECT raw FROM globals WHERE key = ?").get(key) as { raw: string } | undefined;
    return row ? (JSON.parse(row.raw) as T) : null;
  }

  lastSync(): string | null {
    const row = this.db.prepare("SELECT MAX(fetched_at) AS last FROM days").get() as { last: string | null };
    return row?.last ?? null;
  }

  saveActivityDetail(id: string | number, raw: Json): void {
    this.db.prepare("INSERT OR REPLACE INTO activity_details VALUES (?, ?, ?)").run(String(id), JSON.stringify(raw), this.now());
  }

  hasActivityDetail(id: string | number): boolean {
    return !!this.db.prepare("SELECT 1 FROM activity_details WHERE id = ?").get(String(id));
  }

  loadActivityDetails(): Record<string, Json> {
    const rows = this.db.prepare("SELECT id, raw FROM activity_details").all() as { id: string; raw: string }[];
    return Object.fromEntries(rows.map((r) => [r.id, JSON.parse(r.raw)]));
  }
}
