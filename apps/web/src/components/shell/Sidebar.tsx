"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountModal } from "@/components/modals/AccountModal";
import { fmtSync } from "@/lib/format";
import { useDash } from "@/store/DashboardContext";

export const NAV: [string, string][] = [
  ["/hoy", "Hoy"], ["/entrenador", "Entrenador"], ["/salud", "Salud"], ["/sueno", "Sueño"], ["/recuperacion", "Recuperación"],
  ["/rendimiento", "Rendimiento"], ["/actividades", "Actividades"], ["/reloj", "Mi reloj"], ["/perfil", "Perfil"],
];

export function Sidebar() {
  const path = usePathname();
  const { data, demo, theme, toggleTheme, openModal } = useDash();
  return (
    <aside className="sidebar">
      <div className="brand">
        <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
          <path d="M2 12h4l2.5-6 4 12 3-8 1.5 2H22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>Pulso</span>
      </div>
      <nav className="nav">
        {NAV.map(([href, label]) => (
          <Link key={href} href={href} className={path === href ? "on" : ""}>{label}</Link>
        ))}
      </nav>
      <div className="sidebar-foot">
        <div className="device">{data?.performance.devices[0] ?? "Garmin fēnix 8"}</div>
        <div>{demo ? "Datos de demostración" : `Última sincronización: ${fmtSync(data?.lastSync ?? null)}`}</div>
        <button className="link" onClick={() => openModal(<AccountModal />)}>Cuenta Garmin</button>
        <button className="link" onClick={toggleTheme}>{theme === "dark" ? "Tema claro" : "Tema oscuro"}</button>
      </div>
    </aside>
  );
}
