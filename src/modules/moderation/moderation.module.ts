import { Module } from "@nestjs/common";
import { AdminAuditModule } from "../admin-audit/admin-audit.module";

import { AdminPermissionGuard } from "../admin-users/admin-permission.guard";
import { AdminProxyGuard } from "../admin-users/admin-proxy.guard";
import { AdminRolePermissionsService } from "../admin-users/admin-role-permissions.service";
import { PrismaModule } from "../prisma/prisma.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { StreamsModule } from "../streams/streams.module";
import { StreamStaffModule } from "../stream-staff/stream-staff.module";
import { AdminModerationController } from "./admin-moderation.controller";
import { ModerationController } from "./moderation.controller";
import { ModerationService } from "./moderation.service";

@Module({
  imports: [
    PrismaModule,
    StreamsModule,
    RealtimeModule,
    AdminAuditModule,
    StreamStaffModule,
  ],
  controllers: [ModerationController, AdminModerationController],
  providers: [
    ModerationService,
    AdminProxyGuard,
    AdminPermissionGuard,
    AdminRolePermissionsService,
  ],
  exports: [ModerationService],
})
export class ModerationModule { }