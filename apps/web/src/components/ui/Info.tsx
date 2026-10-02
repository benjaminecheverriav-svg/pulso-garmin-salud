"use client";

import { GLOSSARY } from "@/lib/glossary-training";
import { useDash } from "@/store/DashboardContext";

/** Botón "?" que abre la explicación de una métrica. */
export function Info({ k }: { k: string }) {
  const { openModal } = useDash();
  const g = GLOSSARY[k];
  if (!g) return null;
  return (
    <button
      className="info"
      aria-label="¿Qué significa?"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openModal(
          <>
            <h2>{g.t}</h2>
            <div className="gloss">
              <h3>¿Qué es?</h3><p>{g.what}</p>
              <h3>¿Por qué importa?</h3><p>{g.why}</p>
              <h3>Valores de referencia</h3><p>{g.ref}</p>
              <h3>¿Cómo mejorarlo?</h3><p>{g.tip}</p>
            </div>
            <div className="actions"><button className="primary" onClick={() => openModal(null)}>Entendido</button></div>
          </>,
        );
      }}
    >
      ?
    </button>
  );
}
