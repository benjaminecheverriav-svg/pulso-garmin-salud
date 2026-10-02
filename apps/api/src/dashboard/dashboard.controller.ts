import { Body, Controller, Get, HttpException, Post, Query, Res } from "@nestjs/common";
import type { ChatMessage, Dashboard } from "@pulso/shared";
import type { Response } from "express";
import { AiCoachService } from "../ai/ai-coach.service";
import { DashboardService } from "./dashboard.service";

@Controller()
export class DashboardController {
  constructor(
    private readonly dashboard: DashboardService,
    private readonly ai: AiCoachService,
  ) {}

  @Get("dashboard")
  get(@Query("demo") demo?: string): Dashboard {
    return this.dashboard.build(demo === "true");
  }

  /** Respuesta del entrenador con IA, enviada en streaming como texto plano. */
  @Post("coach/chat")
  async chat(@Body() body: { messages: ChatMessage[]; demo?: boolean }, @Res() res: Response): Promise<void> {
    if (!this.ai.enabled) {
      throw new HttpException("Añade ANTHROPIC_API_KEY al archivo .env y reinicia la app para activar el entrenador con IA.", 400);
    }
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    const dash = this.dashboard.cached(Boolean(body.demo));
    for await (const chunk of this.ai.reply(dash, body.messages ?? [])) res.write(chunk);
    res.end();
  }
}
