import { Module } from "@nestjs/common";

import { AdminPermissionGuard } from "../admin-users/admin-permission.guard";
import { AdminProxyGuard } from "../admin-users/admin-proxy.guard";
import { AdminRolePermissionsService } from "../admin-users/admin-role-permissions.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AdminAuditController } from "./admin-audit.controller";
import { AdminAuditService } from "./admin-audit.service";

@Module({
    imports: [PrismaModule],
    controllers: [AdminAuditController],
    providers: [
        AdminAuditService,
        AdminRolePermissionsService,
        AdminProxyGuard,
        AdminPermissionGuard,
    ],
    exports: [AdminAuditService],
})
export class AdminAuditModule { }