import { Module } from "@nestjs/common";
import { AdminAuditModule } from "../admin-audit/admin-audit.module";

import { AdminPermissionGuard } from "../admin-users/admin-permission.guard";
import { AdminProxyGuard } from "../admin-users/admin-proxy.guard";
import { AdminRolePermissionsService } from "../admin-users/admin-role-permissions.service";
import { EmailModule } from "../email/email.module";
import { ModerationModule } from "../moderation/moderation.module";
import { PrismaModule } from "../prisma/prisma.module";
import { AdminBanAppealsController } from "./admin-ban-appeals.controller";
import { BanAppealsController } from "./ban-appeals.controller";
import { BanAppealsService } from "./ban-appeals.service";

@Module({
  imports: [
    PrismaModule,
    ModerationModule,
    EmailModule,
    AdminAuditModule,
  ],
  controllers: [BanAppealsController, AdminBanAppealsController],
  providers: [
    BanAppealsService,
    AdminProxyGuard,
    AdminPermissionGuard,
    AdminRolePermissionsService,
  ],
  exports: [BanAppealsService],
})
export class BanAppealsModule {}