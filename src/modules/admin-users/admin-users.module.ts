import { Module } from "@nestjs/common";
import { AdminAuditModule } from "../admin-audit/admin-audit.module";

import { AppConfigModule } from "../app-config/app-config.module";
import { ModerationModule } from "../moderation/moderation.module";
import { PrismaModule } from "../prisma/prisma.module";
import { AdminProxyGuard } from "./admin-proxy.guard";
import { AdminRolePermissionsController } from "./admin-role-permissions.controller";
import { AdminRolePermissionsService } from "./admin-role-permissions.service";
import { AdminUsersController } from "./admin-users.controller";
import { AdminUsersService } from "./admin-users.service";

@Module({
    imports: [
    PrismaModule,
    AppConfigModule,
    ModerationModule,
    AdminAuditModule,
  ],
    controllers: [AdminUsersController, AdminRolePermissionsController],
    providers: [
        AdminUsersService,
        AdminRolePermissionsService,
        AdminProxyGuard,
    ],
    exports: [AdminUsersService, AdminRolePermissionsService],
})
export class AdminUsersModule { }