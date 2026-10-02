import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { GarminApiService } from "./garmin-api.service";
import { GarminAuthService } from "./garmin-auth.service";
import { GarminController } from "./garmin.controller";
import { GarminHttpService } from "./garmin-http.service";
import { SyncService } from "./sync.service";

@Module({
  imports: [AiModule],
  controllers: [GarminController],
  providers: [GarminHttpService, GarminApiService, GarminAuthService, SyncService],
  exports: [GarminAuthService],
})
export class GarminModule {}
