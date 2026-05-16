import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";

import { AdvertisementsController } from "./advertisements.controller";
import { AdvertisementsService } from "./advertisements.service";
import { AdvertisementRenewalService } from "./advertisement-renewal.service";

@Module({
  imports: [
    MulterModule.register({
      limits: {
        fileSize: 50 * 1024 * 1024,
        files: 8,
      },
    }),
  ],
  controllers: [AdvertisementsController],
  providers: [AdvertisementsService, AdvertisementRenewalService],
  exports: [AdvertisementsService],
})
export class AdvertisementsModule {}
