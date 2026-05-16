import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { DmsController } from "./dms.controller";
import { DmsService } from "./dms.service";

@Module({
    imports: [PrismaModule, RealtimeModule, NotificationsModule],
    controllers: [DmsController],
    providers: [DmsService],
    exports: [DmsService],
})
export class DmsModule { }