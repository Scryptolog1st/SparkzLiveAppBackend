import { Module } from "@nestjs/common";

import { ApiObservabilityModule } from "../api-observability/api-observability.module";
import { PrismaModule } from "../prisma/prisma.module";
import { VideoController } from "./video.controller";
import { VideoService } from "./video.service";

@Module({
  imports: [PrismaModule, ApiObservabilityModule],
  controllers: [VideoController],
  providers: [VideoService],
  exports: [VideoService],
})
export class VideoModule { }