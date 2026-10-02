import type { Le8 } from "@pulso/shared";
import Link from "next/link";
import { Badge } from "@/components/ui/basics";
import { Info } from "@/components/ui/Info";
import { Ring, RingCard } from "@/components/ui/Ring";
import { nf } from "@/lib/format";
import { toneVar } from "@/lib/status";

const tone = (s: number | null) => (s == null ? "" : s >= 80 ? "good" : s >= 50 ? "warning" : "critical");

/** Salud cardiovascular (AHA Life's Essential 8) con sus 8 componentes. */
export function Le8Section({ le }: { le: Le8 }) {
  return (
    <div className="grid g3">
      <RingCard ring={<Ring value={le.score} max={100} color={toneVar(tone(le.score))} big={nf(le.score)} unit="de 100" />}
        title={<>Salud cardiovascular <Info k="le8" /> {le.level ? <Badge label={le.level} tone={tone(le.score)} /> : null}</>}
        caption={<>Calculada con {le.complete} de {le.of} factores. {le.complete < le.of ? <><Link href="/perfil">Completa tu perfil</Link> para afinarla.</> : null}</>} />
      <div className="card span2">
        <div className="factors">
          {le.components.map((c) => (
            <div className="factor" key={c.key}>
              <span className="name">{c.name} <span className="muted">· {c.value}</span></span>
              <span className="val">{c.score == null ? "—" : c.score}</span>
              <div className="bar"><div style={{ width: `${c.score ?? 0}%`, background: toneVar(tone(c.score)) }} /></div>
              {c.tip ? <span className="fb">{c.tip}</span> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
