import { Injectable } from "@nestjs/common";
import type { GarminProfile, ManualProfile, Profile } from "@pulso/shared";
import { round, type Json } from "../common/util";
import { normalizeUser } from "../normalize/user";
import { StorageService } from "../storage/storage.service";

export const DEFAULT_PROFILE: ManualProfile = {
  goal: "salud", raceDate: null, targetTime: null, daysPerWeek: 4, experience: "intermedio", injuries: "",
  sex: null, age: null, heightCm: null, weightKg: null,
  smoking: null, bpSys: null, bpDia: null, bpMeds: false, nonHdl: null, cholMeds: false,
  glucose: null, a1c: null, diabetes: false, diet: null, alcoholWeek: null,
  familyCvd: false, familyDiabetes: false, snoring: false,
};

export const DEMO_PROFILE: ManualProfile = {
  ...DEFAULT_PROFILE, sex: "M", age: 31, heightCm: 178, weightKg: 72.5, goal: "media", targetTime: "1:25:00",
  daysPerWeek: 5, smoking: "nunca", diet: 3, alcoholWeek: 3,
};

/** snake_case (versión Python) → camelCase. */
const camel = (k: string) => k.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

/** Combina el perfil de Garmin con lo que la persona ingresó (lo manual gana). */
export function effectiveProfile(garmin: Partial<GarminProfile>, manual: ManualProfile, lthr?: number | null): Profile {
  const out: Json = { ...garmin };
  for (const [k, v] of Object.entries(manual)) if ((v !== null && v !== "") || !(k in out)) out[k] = v;
  const h = out.heightCm, w = out.weightKg;
  out.bmi = h && w ? round(w / (h / 100) ** 2, 1) : null;
  if (lthr && !out.lthr) out.lthr = lthr;
  return out as Profile;
}

@Injectable()
export class ProfileService {
  constructor(private readonly storage: StorageService) {}

  manual(): ManualProfile {
    const raw = this.storage.loadGlobal<Json>("user_profile") ?? {};
    const data: Json = { ...DEFAULT_PROFILE };
    for (const [k, v] of Object.entries(raw)) if (camel(k) in DEFAULT_PROFILE) data[camel(k)] = v;
    return data as ManualProfile;
  }

  save(values: Partial<ManualProfile>): ManualProfile {
    const data: Json = this.manual();
    for (const [k, v] of Object.entries(values)) if (k in DEFAULT_PROFILE) data[k] = v === "" ? null : v;
    this.storage.saveGlobal("user_profile", data);
    return data as ManualProfile;
  }

  garmin(): GarminProfile | Record<string, never> {
    const raw = this.storage.loadGlobal("user_settings");
    return raw ? normalizeUser(raw) : {};
  }

  effective(): Profile {
    return effectiveProfile(this.garmin(), this.manual());
  }
}
