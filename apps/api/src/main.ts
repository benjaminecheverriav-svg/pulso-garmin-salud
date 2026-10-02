import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { env } from "./config/paths";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: ["log", "warn", "error"] });
  app.setGlobalPrefix("api");
  // Solo escucha en este equipo: los datos de salud nunca quedan expuestos a la red.
  await app.listen(env.port, "127.0.0.1");
  new Logger("Pulso").log(`API lista en http://localhost:${env.port}/api`);
}

void bootstrap();
