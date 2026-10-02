/** Llamadas a la API de NestJS (Next las reenvía de /api/* a localhost:8765). */
import type { ChatMessage, Dashboard, GarminProfile, ManualProfile, Status } from "@pulso/shared";

async function request<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, body === undefined ? {} : {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { message?: string }).message || res.statusText);
  return json as T;
}

export const api = {
  status: () => request<Status>("/status"),
  dashboard: (demo: boolean) => request<Dashboard>(`/dashboard${demo ? "?demo=true" : ""}`),
  login: (email: string, password: string) => request<{ result: "ok" | "mfa" }>("/login", { email, password }),
  mfa: (code: string) => request<{ result: string }>("/mfa", { code }),
  logout: () => request<{ result: string }>("/logout", {}),
  sync: (days: number) => request<{ result: string }>("/sync", { days }),
  profile: () => request<{ manual: ManualProfile; garmin: Partial<GarminProfile> }>("/profile"),
  saveProfile: (values: Partial<ManualProfile>) => request<{ manual: ManualProfile }>("/profile", { values }),
};

/** Envía la conversación y va entregando la respuesta de la IA a medida que llega. */
export async function streamChat(messages: ChatMessage[], demo: boolean, onChunk: (text: string) => void): Promise<void> {
  const res = await fetch("/api/coach/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, demo }),
  });
  if (!res.ok || !res.body) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || "Error del entrenador con IA");
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
}

/** localStorage protegido: puede no existir (modo privado, sin permisos…). */
export const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* sin almacenamiento disponible */
    }
  },
};
