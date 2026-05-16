import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { MilestonesController } from "./milestones.controller";
import { MilestonesService } from "./milestones.service";

@Module({
  imports: [UsersModule, NotificationsModule],
  controllers: [MilestonesController],
  providers: [MilestonesService],
  exports: [MilestonesService],
})
export class MilestonesModule { }