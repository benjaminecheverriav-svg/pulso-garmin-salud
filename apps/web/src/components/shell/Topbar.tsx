"use client";

import { LoginModal } from "@/components/modals/LoginModal";
import { type Range, useDash } from "@/store/DashboardContext";

const RANGES: Range[] = [7, 30, 90];

/** Navegación por días, rango de tendencias y botón de sincronizar. */
export function Topbar() {
  const { data, idx, setIdx, range, setRange, status, sync, startSync, openModal } = useDash();
  const days = data?.days ?? [];
  const last = days.length - 1;
  const onSync = () => (status?.connected ? void startSync(30) : openModal(<LoginModal />));
  return (
    <>
      <header className="topbar">
        <div className="date-nav">
          <button aria-label="Día anterior" disabled={idx <= 0} onClick={() => setIdx(Math.max(0, idx - 1))}>‹</button>
          <input
            type="date"
            value={days[idx]?.date ?? ""}
            min={days[0]?.date}
            max={days[last]?.date}
            onChange={(e) => {
              const i = days.findIndex((d) => d.date === e.target.value);
              if (i >= 0) setIdx(i);
            }}
          />
          <button aria-label="Día siguiente" disabled={idx >= last} onClick={() => setIdx(Math.min(last, idx + 1))}>›</button>
          <button className="chip" onClick={() => setIdx(last)}>Hoy</button>
        </div>
        <div className="range" role="group" aria-label="Rango de tendencias">
          {RANGES.map((r) => (
            <button key={r} className={range === r ? "on" : ""} onClick={() => setRange(r)}>{r} d</button>
          ))}
        </div>
        <button className="primary" disabled={!!sync?.running} onClick={onSync}>Sincronizar</button>
      </header>
      {sync ? (
        <div className="sync-bar">
          <div style={{ width: `${sync.total ? (sync.progress / sync.total) * 100 : 5}%` }} />
          <span>{sync.error ? `Error: ${sync.error}` : sync.message || "Sincronizando…"}</span>
        </div>
      ) : null}
    </>
  );
}
