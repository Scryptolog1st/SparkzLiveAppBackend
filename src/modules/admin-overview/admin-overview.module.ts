import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AdminStoreModule } from "../admin-store/admin-store.module";
import { StreamsModule } from "../streams/streams.module";
import { DiscoveryModule } from "../discovery/discovery.module";
import { AdminOverviewController } from "./admin-overview.controller";
import { AdminOverviewService } from "./admin-overview.service";

@Module({
  imports: [PrismaModule, AdminStoreModule, StreamsModule, DiscoveryModule],
  controllers: [AdminOverviewController],
  providers: [AdminOverviewService],
  exports: [AdminOverviewService],
})
export class AdminOverviewModule { }