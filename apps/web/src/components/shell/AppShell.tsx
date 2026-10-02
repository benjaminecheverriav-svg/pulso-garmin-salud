"use client";

import type { ReactNode } from "react";
import { DashboardProvider, useDash } from "@/store/DashboardContext";
import { useBoot } from "@/store/useBoot";
import { ModalHost, TooltipLayer } from "./Overlays";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

function Content({ children }: { children: ReactNode }) {
  useBoot();
  const { data, loading, status } = useDash();
  let body: ReactNode = children;
  if (loading || (!status && !data)) body = <div className="empty">{loading ?? "Cargando…"}</div>;
  else if (!data) body = <div className="empty">Conecta tu cuenta de Garmin o abre el modo demo para empezar.</div>;
  return (
    <>
      <Sidebar />
      <main>
        <Topbar />
        <section className="view">{body}</section>
      </main>
      <ModalHost />
      <TooltipLayer />
    </>
  );
}

/** Estructura común de todas las páginas: estado global, menú, barra superior y modales. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <DashboardProvider>
      <Content>{children}</Content>
    </DashboardProvider>
  );
}
