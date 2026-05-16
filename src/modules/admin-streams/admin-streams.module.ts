import { Module } from "@nestjs/common";
import { AdminAuditModule } from "../admin-audit/admin-audit.module";

import { AdminPermissionGuard } from "../admin-users/admin-permission.guard";
import { AdminProxyGuard } from "../admin-users/admin-proxy.guard";
import { AdminRolePermissionsService } from "../admin-users/admin-role-permissions.service";
import { PrismaModule } from "../prisma/prisma.module";
import { StreamsModule } from "../streams/streams.module";
import { VideoModule } from "../video/video.module";
import { AdminStreamsController } from "./admin-streams.controller";
import { AdminStreamsService } from "./admin-streams.service";

@Module({
  imports: [
    PrismaModule,
    StreamsModule,
    VideoModule,
    AdminAuditModule,
  ],
  controllers: [AdminStreamsController],
  providers: [
    AdminStreamsService,
    AdminProxyGuard,
    AdminPermissionGuard,
    AdminRolePermissionsService,
  ],
  exports: [AdminStreamsService],
})
export class AdminStreamsModule { }