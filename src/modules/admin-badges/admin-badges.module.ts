import { Module } from "@nestjs/common";

import { AdminAuditModule } from "../admin-audit/admin-audit.module";
import { AdminPermissionGuard } from "../admin-users/admin-permission.guard";
import { AdminProxyGuard } from "../admin-users/admin-proxy.guard";
import { AdminRolePermissionsService } from "../admin-users/admin-role-permissions.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AdminBadgesController } from "./admin-badges.controller";
import { AdminBadgesService } from "./admin-badges.service";

@Module({
  imports: [PrismaModule, AdminAuditModule],
  controllers: [AdminBadgesController],
  providers: [
    AdminBadgesService,
    AdminProxyGuard,
    AdminPermissionGuard,
    AdminRolePermissionsService,
  ],
  exports: [AdminBadgesService],
})
export class AdminBadgesModule {}
