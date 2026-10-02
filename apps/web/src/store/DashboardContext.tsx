"use client";

import type { Dashboard, DayRecord, Status, SyncState } from "@pulso/shared";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, storage } from "@/lib/api";
import { useSync } from "./useSync";

export type Range = 7 | 30 | 90;
type Theme = "dark" | "light";

interface DashboardState {
  data: Dashboard | null;
  demo: boolean;
  idx: number;
  range: Range;
  theme: Theme;
  status: Status | null;
  loading: string | null;
  modal: ReactNode | null;
  sync: SyncState | null;
  setIdx: (i: number) => void;
  setRange: (r: Range) => void;
  toggleTheme: () => void;
  openModal: (node: ReactNode | null) => void;
  loadData: (demo: boolean) => Promise<void>;
  refreshStatus: () => Promise<Status | null>;
  startSync: (days?: number) => Promise<void>;
}

const Ctx = createContext<DashboardState | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [demo, setDemo] = useState(false);
  const [idx, setIdx] = useState(0);
  const [range, setRangeState] = useState<Range>(30);
  const [theme, setTheme] = useState<Theme>("dark");
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [modal, openModal] = useState<ReactNode | null>(null);

  const loadData = useCallback(async (asDemo: boolean) => {
    setLoading("Cargando…");
    storage.set("pulso-demo", asDemo ? "1" : "0");
    try {
      const dash = await api.dashboard(asDemo);
      setDemo(asDemo);
      setData(dash);
      setIdx(dash.days.length - 1);
    } finally {
      setLoading(null);
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    const st = await api.status().catch(() => null);
    setStatus(st);
    return st;
  }, []);

  const { sync, startSync } = useSync(refreshStatus, loadData);

  useEffect(() => {
    const t = (storage.get("pulso-theme") as Theme) || "dark";
    document.documentElement.dataset.theme = t;
    setTheme(t);
    setRangeState((Number(storage.get("pulso-range")) || 30) as Range);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const value = useMemo<DashboardState>(() => ({
    data, demo, idx, range, theme, status, loading, modal, sync,
    setIdx, openModal, loadData, refreshStatus, startSync,
    setRange: (r) => { setRangeState(r); storage.set("pulso-range", String(r)); },
    toggleTheme: () => {
      // se aplica antes de re-renderizar para que los gráficos lean ya los colores nuevos
      const next: Theme = theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      storage.set("pulso-theme", next);
      setTheme(next);
    },
  }), [data, demo, idx, range, theme, status, loading, modal, sync, loadData, refreshStatus, startSync]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDash(): DashboardState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDash debe usarse dentro de DashboardProvider");
  return ctx;
}

/** Día seleccionado y los días del rango que terminan en él. */
export function useDays(): { day: DayRecord; days: DayRecord[]; all: DayRecord[] } {
  const { data, idx, range } = useDash();
  const all = data!.days;
  return { day: all[idx], days: all.slice(Math.max(0, idx - range + 1), idx + 1), all };
}
