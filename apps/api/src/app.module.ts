import { Module } from "@nestjs/common";
import { AiModule } from "./ai/ai.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { GarminModule } from "./garmin/garmin.module";
import { ProfileModule } from "./profile/profile.module";
import { StorageModule } from "./storage/storage.module";

@Module({
  imports: [StorageModule, AiModule, GarminModule, ProfileModule, DashboardModule],
})
export class AppModule {}
