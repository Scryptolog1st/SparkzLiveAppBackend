import {
    Controller,
    Get,
    Param,
    Query,
    Req,
    Res,
    UseGuards,
} from "@nestjs/common";
import type { Response } from "express";

import { AdminPermissionGuard } from "../admin-users/admin-permission.guard";
import { ADMIN_PERMISSIONS } from "../admin-users/admin-permissions";
import { AdminProxyGuard } from "../admin-users/admin-proxy.guard";
import { RequireAdminPermission } from "../admin-users/require-admin-permission.decorator";
import { AdminAuditQueryDto } from "./dto/admin-audit-query.dto";
import { AdminAuditService } from "./admin-audit.service";

@Controller("admin/audit-logs")
@UseGuards(AdminProxyGuard, AdminPermissionGuard)
export class AdminAuditController {
    constructor(private readonly adminAudit: AdminAuditService) { }

    @Get("summary")
    @RequireAdminPermission(ADMIN_PERMISSIONS.AUDIT_LOGS_VIEW)
    async summary(@Req() req: any) {
        return this.adminAudit.getSummary(req.adminUser.id);
    }

    @Get("export")
    @RequireAdminPermission(ADMIN_PERMISSIONS.AUDIT_LOGS_EXPORT)
    async exportCsv(
        @Req() req: any,
        @Query() query: AdminAuditQueryDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const csv = await this.adminAudit.exportCsv(req.adminUser.id, query);
        const fileStamp = new Date().toISOString().slice(0, 10);

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="sparkz_audit_export_${fileStamp}.csv"`,
        );

        return csv;
    }

    @Get()
    @RequireAdminPermission(ADMIN_PERMISSIONS.AUDIT_LOGS_VIEW)
    async list(@Req() req: any, @Query() query: AdminAuditQueryDto) {
        return this.adminAudit.list(req.adminUser.id, query);
    }

    @Get(":id")
    @RequireAdminPermission(ADMIN_PERMISSIONS.AUDIT_LOGS_VIEW)
    async byId(@Req() req: any, @Param("id") id: string) {
        return this.adminAudit.getById(req.adminUser.id, id);
    }
}