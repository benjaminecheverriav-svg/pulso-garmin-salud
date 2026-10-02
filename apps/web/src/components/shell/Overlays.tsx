"use client";

import { useEffect, useRef } from "react";
import { useDash } from "@/store/DashboardContext";

/** Ventana modal única de la app. */
export function ModalHost() {
  const { modal } = useDash();
  if (!modal) return null;
  return (
    <div className="modal">
      <div className="modal-card">{modal}</div>
    </div>
  );
}

/** Tooltip para elementos HTML/SVG con atributo data-tip (barras apiladas, hipnograma…). */
export function TooltipLayer() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const tip = ref.current;
      if (!tip) return;
      const el = (e.target as Element | null)?.closest?.("[data-tip]");
      if (!el) {
        tip.hidden = true;
        return;
      }
      tip.textContent = el.getAttribute("data-tip");
      tip.hidden = false;
      tip.style.left = `${Math.min(e.clientX + 12, window.innerWidth - tip.offsetWidth - 8)}px`;
      tip.style.top = `${e.clientY + 14}px`;
    };
    document.addEventListener("mousemove", onMove);
    return () => document.removeEventListener("mousemove", onMove);
  }, []);
  return <div ref={ref} className="tooltip" hidden />;
}
