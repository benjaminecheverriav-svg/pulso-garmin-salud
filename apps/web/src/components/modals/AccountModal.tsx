"use client";

import { api } from "@/lib/api";
import { fmtSync } from "@/lib/format";
import { useDash } from "@/store/DashboardContext";
import { LoginModal } from "./LoginModal";

/** Cuenta Garmin: sincronizar historial, alternar demo y cerrar sesión. */
export function AccountModal() {
  const { status, demo, openModal, startSync, loadData, refreshStatus } = useDash();
  if (!status?.connected) return <LoginModal />;
  const sync = (days: number) => {
    openModal(null);
    void startSync(days);
  };
  return (
    <>
      <h2>Cuenta Garmin</h2>
      <p>Conectado como <b>{status.profile.name ?? "—"}</b>.<br />Última sincronización: {fmtSync(status.lastSync)}</p>
      <div className="actions column">
        <button className="primary" onClick={() => sync(30)}>Sincronizar últimos 30 días</button>
        <button className="secondary" onClick={() => sync(90)}>Descargar 90 días de historial</button>
        <button className="secondary" onClick={() => sync(180)}>Descargar 180 días de historial</button>
        <button className="secondary" onClick={() => { openModal(null); void loadData(!demo); }}>
          {demo ? "Ver mis datos reales" : "Ver datos de demostración"}
        </button>
        <button className="secondary" onClick={async () => { await api.logout(); await refreshStatus(); openModal(<LoginModal />); }}>
          Cerrar sesión
        </button>
        <button className="secondary" onClick={() => openModal(null)}>Cerrar</button>
      </div>
    </>
  );
}
