import { Module } from "@nestjs/common";
import { AiCoachService } from "./ai-coach.service";

@Module({
  providers: [AiCoachService],
  exports: [AiCoachService],
})
export class AiModule {}
