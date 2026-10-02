import Anthropic from "@anthropic-ai/sdk";
import { Injectable, Logger } from "@nestjs/common";
import type { ChatMessage, Dashboard } from "@pulso/shared";
import { env } from "../config/paths";
import { buildAiContext } from "./ai-context";
import { SYSTEM_PROMPT } from "./system-prompt";

const MODEL = "claude-opus-5-5";

/** Entrenador conversacional con Claude (opcional: requiere ANTHROPIC_API_KEY en .env). */
@Injectable()
export class AiCoachService {
  private readonly log = new Logger("AiCoach");
  private client: Anthropic | null = null;

  get enabled(): boolean {
    return Boolean(env.anthropicKey);
  }

  /** Devuelve la respuesta en fragmentos de texto a medida que Claude la escribe. */
  async *reply(dash: Dashboard, messages: ChatMessage[]): AsyncGenerator<string> {
    this.client ??= new Anthropic();
    const stream = this.client.beta.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: "medium" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [
        { type: "text", text: SYSTEM_PROMPT },
        { type: "text", text: "Datos actuales del usuario (JSON):\n" + buildAiContext(dash), cache_control: { type: "ephemeral" } },
      ],
      messages: messages.filter((m) => m.content).slice(-20).map((m) => ({ role: m.role, content: m.content })),
    });
    try {
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") yield event.delta.text;
      }
      const final = await stream.finalMessage();
      if (final.stop_reason === "refusal") yield "\n\n_(No pude responder a esto. Prueba a reformular la pregunta.)_";
      else if (final.stop_reason === "max_tokens") yield "\n\n_(Respuesta cortada por longitud.)_";
    } catch (error) {
      yield this.errorMessage(error);
    }
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Anthropic.AuthenticationError) return "La clave ANTHROPIC_API_KEY no es válida. Revisa el archivo .env.";
    if (error instanceof Anthropic.RateLimitError) return "Se alcanzó el límite de uso de la API. Inténtalo de nuevo en un minuto.";
    if (error instanceof Anthropic.APIConnectionError) return "No hay conexión con el servicio de IA. Revisa tu internet.";
    if (error instanceof Anthropic.APIError) {
      this.log.warn(`Error de la API de Claude: ${error.message}`);
      return `Error del servicio de IA (${error.status}). Inténtalo más tarde.`;
    }
    throw error;
  }
}
