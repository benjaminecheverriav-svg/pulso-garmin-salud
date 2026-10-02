"use client";

import type { Status, SyncState } from "@pulso/shared";
import { useCallback, useState } from "react";
import { api } from "@/lib/api";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Lanza la sincronización con Garmin y sigue su progreso hasta terminar. */
export function useSync(refreshStatus: () => Promise<Status | null>, loadData: (demo: boolean) => Promise<void>) {
  const [sync, setSync] = useState<SyncState | null>(null);

  const startSync = useCallback(async (days = 30) => {
    await api.sync(days);
    for (;;) {
      const st = await refreshStatus();
      if (!st) break;
      setSync(st.sync);
      if (!st.sync.running) break;
      await wait(1200);
    }
    const final = await refreshStatus();
    if (final && !final.sync.error) await loadData(false);
    setTimeout(() => setSync(null), 2500);
  }, [refreshStatus, loadData]);

  return { sync, startSync };
}
