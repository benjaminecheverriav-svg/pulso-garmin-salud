"use client";

import { type FormEvent, useState } from "react";
import { api } from "@/lib/api";
import { useDash } from "@/store/DashboardContext";

/** Inicio de sesión en Garmin Connect (con código de verificación si Garmin lo pide). */
export function LoginModal({ error: initialError = "" }: { error?: string }) {
  const { data, openModal, loadData, startSync, refreshStatus } = useDash();
  const [step, setStep] = useState<"login" | "mfa">("login");
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);

  const done = async () => {
    openModal(null);
    await refreshStatus();
    await startSync(60);
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      if (step === "login") {
        const r = await api.login(String(f.get("email")), String(f.get("password")));
        if (r.result === "mfa") setStep("mfa");
        else await done();
      } else {
        await api.mfa(String(f.get("code")));
        await done();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (step === "mfa") {
    return (
      <form onSubmit={submit}>
        <h2>Código de verificación</h2>
        <p>Garmin te envió un código por correo o SMS.</p>
        <label htmlFor="code">Código</label>
        <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required />
        <div className="error">{error}</div>
        <div className="actions"><button className="primary" type="submit" disabled={busy}>Verificar</button></div>
      </form>
    );
  }
  return (
    <form onSubmit={submit}>
      <h2>Conecta tu Garmin</h2>
      <p>Usa tu cuenta de Garmin Connect. Tus credenciales solo viajan de este equipo a Garmin; se guarda un token de sesión en la carpeta <code>data/</code>, nunca la contraseña.</p>
      <label htmlFor="email">Correo</label>
      <input id="email" name="email" type="email" autoComplete="username" required />
      <label htmlFor="password">Contraseña</label>
      <input id="password" name="password" type="password" autoComplete="current-password" required />
      <div className="error">{error}</div>
      <div className="actions">
        <button className="primary" type="submit" disabled={busy}>{busy ? "Conectando…" : "Conectar"}</button>
        <button className="secondary" type="button" onClick={() => { openModal(null); void loadData(true); }}>Ver demo</button>
        {data ? <button className="secondary" type="button" onClick={() => openModal(null)}>Cerrar</button> : null}
      </div>
      <p className="fine">El primer inicio de sesión lo hace la librería <i>garminconnect</i> (Python), la misma vía que la web de Garmin Connect. Si Garmin pide un código de verificación, lo introducirás en el siguiente paso.</p>
    </form>
  );
}
