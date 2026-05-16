import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { LiveopsController } from "./liveops.controller";
import { LiveopsService } from "./liveops.service";

@Module({
  imports: [PrismaModule],
  controllers: [LiveopsController],
  providers: [LiveopsService],
  exports: [LiveopsService],
})
export class LiveopsModule { }