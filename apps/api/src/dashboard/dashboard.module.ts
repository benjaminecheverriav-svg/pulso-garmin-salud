import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { ProfileModule } from "../profile/profile.module";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
  imports: [AiModule, ProfileModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
