import { Module } from "@nestjs/common";
import { ProfilesController } from "./profiles.controller";
import { UsersModule } from "../users/users.module";
import { ScheduleModule } from "../schedule/schedule.module";
import { FavoritesModule } from "../favorites/favorites.module";

@Module({
  imports: [UsersModule, ScheduleModule, FavoritesModule],
  controllers: [ProfilesController],
})
export class ProfilesModule { }