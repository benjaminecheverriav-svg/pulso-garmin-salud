import type { ReactNode } from "react";

/** Convierte **negrita** y *cursiva* en elementos React (sin HTML inyectado). */
export function inline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|_\([^)]*\)_)/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <b key={i}>{p.slice(2, -2)}</b>;
    if (p.startsWith("_(") && p.endsWith(")_")) return <i key={i}>{p.slice(1, -1)}</i>;
    if (p.startsWith("*") && p.endsWith("*") && p.length > 2) return <i key={i}>{p.slice(1, -1)}</i>;
    return p;
  });
}

/** Markdown mínimo para las respuestas del entrenador: párrafos, listas y títulos. */
export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: ReactNode[] = [];
  const flush = () => {
    if (list.length) blocks.push(<ul key={`u${blocks.length}`}>{list}</ul>);
    list = [];
  };
  text.split("\n").forEach((line, i) => {
    const li = line.match(/^\s*(?:[-*]|\d+\.)\s+(.*)/);
    if (li) {
      list.push(<li key={i}>{inline(li[1])}</li>);
      return;
    }
    flush();
    if (/^#{1,4}\s/.test(line)) blocks.push(<h4 key={i}>{inline(line.replace(/^#+\s/, ""))}</h4>);
    else if (line.trim()) blocks.push(<p key={i}>{inline(line)}</p>);
  });
  flush();
  return <>{blocks}</>;
}
