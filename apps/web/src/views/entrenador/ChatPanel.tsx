"use client";

import type { ChatMessage } from "@pulso/shared";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/ui/RichText";
import { storage, streamChat } from "@/lib/api";
import { useDash } from "@/store/DashboardContext";

const QUICK = [
  "Evalúa mi último entrenamiento", "¿Qué entreno hoy y por qué?", "Analiza mi semana y dime qué mejorar",
  "Explícame mi sueño de anoche en palabras simples", "¿Qué dicen mis datos de mi salud cardiovascular?", "Diséñame un plan de 4 semanas para mi objetivo",
];

/** Chat con el entrenador de IA (Claude); la respuesta llega en tiempo real. */
export function ChatPanel() {
  const { data, demo } = useDash();
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const send = useCallback(async (text: string) => {
    if (busy || !text.trim()) return;
    setBusy(true);
    const history: ChatMessage[] = [...chat, { role: "user", content: text }];
    let answer = "";
    setChat([...history, { role: "assistant", content: "" }]);
    try {
      await streamChat(history, demo, (chunk) => {
        answer += chunk;
        setChat([...history, { role: "assistant", content: answer }]);
      });
    } catch (e) {
      answer = (e as Error).message;
      setChat([...history, { role: "assistant", content: answer }]);
    } finally {
      setBusy(false);
      storage.set("pulso-chat", JSON.stringify([...history, { role: "assistant", content: answer }].slice(-30)));
    }
  }, [busy, chat, demo]);

  useEffect(() => {
    try { setChat(JSON.parse(storage.get("pulso-chat") ?? "[]")); } catch { /* conversación vacía */ }
    const pending = sessionStorage.getItem("pulso-ask");
    if (pending) {
      sessionStorage.removeItem("pulso-ask");
      void send(pending);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [chat]);

  if (!data?.aiEnabled) {
    return (
      <div className="card note-box" id="chat">
        <p><b>Activa el entrenador conversacional.</b> Usa Claude para responder preguntas sobre tus datos, evaluar sesiones en detalle y diseñar planes.</p>
        <p>1. Crea una clave en <b>console.anthropic.com</b> (API Keys). 2. Añade <code>ANTHROPIC_API_KEY=tu_clave</code> al archivo <code>.env</code>. 3. Reinicia la app con <code>iniciar.bat</code>.</p>
        <p className="muted">Tiene un coste por uso (unos céntimos por pregunta). Todo lo demás de la app funciona sin ella.</p>
      </div>
    );
  }
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem("q") as HTMLInputElement;
    void send(input.value);
    input.value = "";
  };
  return (
    <div className="card" id="chat">
      <div className="chat-log" ref={logRef}>
        {chat.length ? chat.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>{m.role === "user" ? m.content : <Markdown text={m.content} />}</div>
        )) : <p className="muted">Pregúntame lo que quieras sobre tus entrenamientos, tu sueño o tu salud. Conozco tus datos de las últimas semanas.</p>}
      </div>
      <div className="chips">{QUICK.map((q) => <button className="chip-s" key={q} onClick={() => void send(q)}>{q}</button>)}</div>
      <form className="chat-form" onSubmit={submit}>
        <input name="q" placeholder="Escribe tu pregunta…" autoComplete="off" />
        <button className="primary" type="submit" disabled={busy}>Enviar</button>
        <button className="secondary" type="button" onClick={() => { setChat([]); storage.set("pulso-chat", "[]"); }}>Borrar</button>
      </form>
      <p className="fine muted">Orientación deportiva y educativa; no sustituye a un médico.</p>
    </div>
  );
}
