import { Module } from "@nestjs/common";

import { AdminAuditModule } from "../admin-audit/admin-audit.module";
import { AdminPermissionGuard } from "../admin-users/admin-permission.guard";
import { AdminProxyGuard } from "../admin-users/admin-proxy.guard";
import { AdminRolePermissionsService } from "../admin-users/admin-role-permissions.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AppConfigController } from "./app-config.controller";
import { AppConfigService } from "./app-config.service";

@Module({
  imports: [PrismaModule, AdminAuditModule],
  controllers: [AppConfigController],
  providers: [
    AppConfigService,
    AdminProxyGuard,
    AdminPermissionGuard,
    AdminRolePermissionsService,
  ],
  exports: [AppConfigService],
})
export class AppConfigModule { }