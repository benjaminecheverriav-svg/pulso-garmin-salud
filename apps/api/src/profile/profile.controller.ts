import { Body, Controller, Get, Post } from "@nestjs/common";
import type { GarminProfile, ManualProfile } from "@pulso/shared";
import { ProfileService } from "./profile.service";

@Controller("profile")
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Get()
  get(): { manual: ManualProfile; garmin: Partial<GarminProfile> } {
    return { manual: this.profile.manual(), garmin: this.profile.garmin() };
  }

  @Post()
  save(@Body() body: { values: Partial<ManualProfile> }): { manual: ManualProfile } {
    return { manual: this.profile.save(body.values ?? {}) };
  }
}
