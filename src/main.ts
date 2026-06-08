import { NestFactory } from "@nestjs/core";
import { Logger, ValidationPipe } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "path";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });

  const trustProxyHeaderSetting = String(
    process.env.ADMIN_AUDIT_TRUST_PROXY_HEADERS ?? process.env.TRUST_PROXY ?? "",
  ).trim().toLowerCase();

  const shouldTrustProxyHeaders = ["1", "true", "yes", "on"].includes(
    trustProxyHeaderSetting,
  );

  if (shouldTrustProxyHeaders) {
    app.set("trust proxy", true);
  }

  app.enableCors({
    origin: [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://10.0.2.2:5173",
      "http://localhost:8081",
      "http://127.0.0.1:8081",
      "http://localhost:19006",
      "http://127.0.0.1:19006",
      "http://192.168.1.35:5173",
      "http://192.168.1.35:8081",
      "http://192.168.1.35:19006",
      // --- ADDED 8082 FOR EXPO WEB ---
      "http://localhost:8082",
      "http://127.0.0.1:8082",
      "http://10.0.2.2:8082",
      "http://192.168.1.35:8082",
    ],
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  app.useStaticAssets(join(process.cwd(), "uploads"), {
    prefix: "/uploads/",
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = Number(process.env.PORT || 3001);
  await app.listen(port, "0.0.0.0");

  const logger = new Logger("Bootstrap");
  logger.log(`API listening on http://0.0.0.0:${port}`);
  logger.log(`LAN access should be available at http://192.168.1.35:${port}`);
}

bootstrap();