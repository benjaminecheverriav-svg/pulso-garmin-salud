import { Body, Controller, Get, HttpException, NotFoundException, Param, Post } from "@nestjs/common";
import type { Status } from "@pulso/shared";
import { AiCoachService } from "../ai/ai-coach.service";
import { StorageService } from "../storage/storage.service";
import { GarminAuthService } from "./garmin-auth.service";
import { SyncService } from "./sync.service";

interface LoginBody { email: string; password: string }
interface MfaBody { code: string }
interface SyncBody { days?: number; force?: boolean }

@Controller()
export class GarminController {
  constructor(
    private readonly auth: GarminAuthService,
    private readonly sync: SyncService,
    private readonly storage: StorageService,
    private readonly ai: AiCoachService,
  ) {}

  @Get("status")
  status(): Status {
    const lastSync = this.storage.lastSync();
    return {
      connected: this.auth.connected,
      profile: this.auth.profile(),
      hasData: lastSync !== null,
      lastSync,
      sync: this.sync.state,
      aiEnabled: this.ai.enabled,
      login: this.auth.state,
    };
  }

  @Post("login")
  async login(@Body() body: LoginBody): Promise<{ result: string }> {
    try {
      return { result: await this.auth.login(body.email, body.password) };
    } catch (e) {
      throw new HttpException(`No se pudo iniciar sesión: ${(e as Error).message}`, 401);
    }
  }

  @Post("mfa")
  async mfa(@Body() body: MfaBody): Promise<{ result: string }> {
    try {
      return { result: await this.auth.submitMfa(body.code) };
    } catch (e) {
      throw new HttpException(`Código incorrecto: ${(e as Error).message}`, 401);
    }
  }

  @Post("logout")
  logout(): { result: string } {
    this.auth.logout();
    return { result: "ok" };
  }

  @Post("sync")
  startSync(@Body() body: SyncBody): { result: string } {
    if (!this.auth.connected) throw new HttpException("Conecta tu cuenta de Garmin primero", 401);
    return { result: this.sync.start(body.days ?? 30, body.force ?? false) };
  }

  /** Respuesta cruda de Garmin para un día (útil para depurar). */
  @Get("raw/:date")
  raw(@Param("date") date: string): unknown {
    const day = this.storage.loadDays()[date];
    if (!day) throw new NotFoundException("Día no sincronizado");
    return day;
  }
}
