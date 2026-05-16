import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { StreamStaffModule } from "../stream-staff/stream-staff.module";
import { StreamsController } from "./streams.controller";
import { StreamsService } from "./streams.service";
import { VideoModule } from "../video/video.module";

@Module({
  imports: [
    UsersModule,
    RealtimeModule,
    VideoModule,
    NotificationsModule,
    StreamStaffModule,
  ],
  controllers: [StreamsController],
  providers: [StreamsService],
  exports: [StreamsService],
})
export class StreamsModule { }