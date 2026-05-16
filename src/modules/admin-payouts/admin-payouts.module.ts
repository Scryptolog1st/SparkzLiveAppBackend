import { Module } from "@nestjs/common";

import { AdminAuditModule } from "../admin-audit/admin-audit.module";
import { AdminPermissionGuard } from "../admin-users/admin-permission.guard";
import { AdminProxyGuard } from "../admin-users/admin-proxy.guard";
import { AdminRolePermissionsService } from "../admin-users/admin-role-permissions.service";
import { EmailModule } from "../email/email.module";
import { PrismaModule } from "../prisma/prisma.module";
import { AdminPayoutsController } from "./admin-payouts.controller";
import { AdminPayoutsService } from "./admin-payouts.service";

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    AdminAuditModule,
  ],
  controllers: [AdminPayoutsController],
  providers: [
    AdminPayoutsService,
    AdminProxyGuard,
    AdminPermissionGuard,
    AdminRolePermissionsService,
  ],
  exports: [AdminPayoutsService],
})
export class AdminPayoutsModule { }
