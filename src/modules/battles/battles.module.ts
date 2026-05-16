import { Module } from "@nestjs/common";
import { BattlesController } from "./battles.controller";
import { BattlesService } from "./battles.service";
import { StreamsModule } from "../streams/streams.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [StreamsModule, RealtimeModule, NotificationsModule],
  controllers: [BattlesController],
  providers: [BattlesService],
  exports: [BattlesService],
})
export class BattlesModule { }