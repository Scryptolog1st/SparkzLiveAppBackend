import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { AdvertisementJobsController } from "./advertisement-jobs.controller";
import { AdvertisementJobsService } from "./advertisement-jobs.service";

@Module({
  imports: [PrismaModule],
  controllers: [AdvertisementJobsController],
  providers: [AdvertisementJobsService],
  exports: [AdvertisementJobsService],
})
export class AdvertisementJobsModule {}
