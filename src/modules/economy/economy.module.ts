import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { BattlesModule } from "../battles/battles.module";
import { MilestonesModule } from "../milestones/milestones.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { EconomyController } from "./economy.controller";
import { EconomyService } from "./economy.service";

@Module({
  imports: [
    UsersModule,
    RealtimeModule,
    BattlesModule,
    MilestonesModule,
    NotificationsModule,
  ],
  controllers: [EconomyController],
  providers: [EconomyService],
  exports: [EconomyService],
})
export class EconomyModule { }