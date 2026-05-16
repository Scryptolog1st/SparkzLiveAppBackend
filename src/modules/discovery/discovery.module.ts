import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ExploreController } from "./controllers/explore.controller";
import { LeaderboardsController } from "./controllers/leaderboards.controller";
import { UsersSearchController } from "./controllers/users-search.controller";
import { DiscoveryService } from "./discovery.service";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [UsersSearchController, LeaderboardsController, ExploreController],
  providers: [DiscoveryService],
  exports: [DiscoveryService],
})
export class DiscoveryModule { }