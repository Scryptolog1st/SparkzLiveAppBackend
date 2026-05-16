import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { StreamStaffController } from "./stream-staff.controller";
import { StreamStaffService } from "./stream-staff.service";

@Module({
  imports: [PrismaModule, RealtimeModule],
  controllers: [StreamStaffController],
  providers: [StreamStaffService],
  exports: [StreamStaffService],
})
export class StreamStaffModule { }