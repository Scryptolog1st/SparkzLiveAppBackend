import { Module } from "@nestjs/common";
import { AdminAuditModule } from "../admin-audit/admin-audit.module";

import { AdminPermissionGuard } from "../admin-users/admin-permission.guard";
import { AdminProxyGuard } from "../admin-users/admin-proxy.guard";
import { AdminRolePermissionsService } from "../admin-users/admin-role-permissions.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AutomodConfigController } from "./automod-config.controller";
import { AutomodConfigService } from "./automod-config.service";

@Module({
  imports: [
    PrismaModule,
    AdminAuditModule,
  ],
  controllers: [AutomodConfigController],
  providers: [AutomodConfigService, AdminProxyGuard, AdminPermissionGuard, AdminRolePermissionsService],
  exports: [AutomodConfigService],
})
export class AutomodConfigModule { }