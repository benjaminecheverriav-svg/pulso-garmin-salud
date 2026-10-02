"use client";

import type { GarminProfile, ManualProfile } from "@pulso/shared";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { Section } from "@/components/ui/basics";
import { ViewHead } from "@/components/ui/Stories";
import { api } from "@/lib/api";
import { useDash } from "@/store/DashboardContext";
import { FIELD_GROUPS, readForm, type Field } from "./fields";

function Input({ f, manual, garmin }: { f: Field; manual: ManualProfile; garmin: Partial<GarminProfile> }) {
  const v = manual[f.key];
  const g = (garmin as Record<string, unknown>)[f.key];
  if (f.type === "check") return <label className="check"><input type="checkbox" name={f.key} defaultChecked={!!v} /> {f.label}</label>;
  if (f.type === "select") {
    return (
      <label>{f.label}
        <select name={f.key} defaultValue={v == null ? "" : String(v)}>
          {f.options!.map(([val, l]) => <option key={String(val)} value={val}>{l}</option>)}
        </select>
      </label>
    );
  }
  return (
    <label>{f.label}
      <input name={f.key} type={f.type} step={f.type === "number" ? "any" : undefined} defaultValue={v == null ? "" : String(v)}
        placeholder={g != null && g !== "" ? `Garmin: ${g}` : undefined} />
    </label>
  );
}

/** Objetivo, datos corporales y cuestionario de salud (se guardan solo en este equipo). */
export function PerfilView() {
  const { demo, loadData } = useDash();
  const router = useRouter();
  const [profile, setProfile] = useState<{ manual: ManualProfile; garmin: Partial<GarminProfile> } | null>(null);
  const [msg, setMsg] = useState("");
  useEffect(() => { void api.profile().then(setProfile); }, []);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await api.saveProfile(readForm(e.currentTarget));
    setMsg("Guardado. Recalculando…");
    await loadData(demo);
    router.push("/salud");
  };
  return (
    <>
      <ViewHead title="Perfil y objetivos" subtitle="Personaliza el entrenador y completa los datos que el reloj no puede medir." />
      {demo ? <div className="card disclaimer">Estás viendo datos de demostración: lo que guardes aquí se aplicará a tus datos reales de Garmin.</div> : null}
      {profile ? (
        <form onSubmit={submit}>
          {FIELD_GROUPS.map(([title, fields]) => (
            <div key={title}>
              <Section title={title} />
              <div className="card form-grid">{fields.map((f) => <Input key={f.key} f={f} manual={profile.manual} garmin={profile.garmin} />)}</div>
            </div>
          ))}
          <div className="actions"><button className="primary" type="submit">Guardar y recalcular</button><span className="muted">{msg}</span></div>
        </form>
      ) : <div className="empty">Cargando perfil…</div>}
      <p className="note-box" style={{ marginTop: 14 }}>Tus datos se guardan solo en este equipo (carpeta <code>data/</code>). Si usas el entrenador con IA, se envía un resumen de tus datos a Claude (Anthropic) para responderte.</p>
    </>
  );
}
