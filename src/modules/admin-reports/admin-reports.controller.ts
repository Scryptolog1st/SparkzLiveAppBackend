import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Query,
    Req,
    UseGuards,
} from "@nestjs/common";
import type { Request } from "express";

import { AdminPermissionGuard } from "../admin-users/admin-permission.guard";
import { ADMIN_PERMISSIONS } from "../admin-users/admin-permissions";
import { AdminProxyGuard } from "../admin-users/admin-proxy.guard";
import { RequireAdminPermission } from "../admin-users/require-admin-permission.decorator";
import { AdminReportsService } from "./admin-reports.service";
import {
    AddAdminReportNoteDto,
    AdminReportsQueryDto,
    AssignAdminReportDto,
    BulkAdminReportStatusDto,
    SearchAdminReportAssigneesDto,
    UpdateAdminReportStatusDto,
} from "./dto/admin-reports.dto";

type AdminRequestContext = {
    requestPath?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    deviceLabel?: string | null;
};

@Controller("admin/reports")
@UseGuards(AdminProxyGuard, AdminPermissionGuard)
export class AdminReportsController {
    constructor(private readonly adminReports: AdminReportsService) { }

    private getHeader(req: Request, name: string) {
        const value = req.headers[name];

        if (Array.isArray(value)) {
            return value[0] ?? "";
        }

        return typeof value === "string" ? value : "";
    }

    private normalizeOptionalString(value?: string | null) {
        const normalized = String(value || "").trim();
        return normalized ? normalized : null;
    }

    private extractIp(req: Request) {
        const forwardedFor = this.getHeader(req, "x-forwarded-for");
        if (forwardedFor) {
            const first = forwardedFor
                .split(",")
                .map((part) => part.trim())
                .find(Boolean);

            if (first) {
                return first;
            }
        }

        const realIp =
            this.getHeader(req, "cf-connecting-ip") ||
            this.getHeader(req, "x-real-ip") ||
            req.ip ||
            "";

        return this.normalizeOptionalString(realIp);
    }

    private buildAuditContext(req: Request): AdminRequestContext {
        const requestPath = this.normalizeOptionalString(req.originalUrl || req.url || "");
        const ipAddress = this.extractIp(req);
        const userAgent = this.normalizeOptionalString(this.getHeader(req, "user-agent"));

        return {
            requestPath,
            ipAddress,
            userAgent,
            deviceLabel: userAgent ? "Admin Dashboard Browser" : null,
        };
    }

    @Get("summary")
    @RequireAdminPermission(ADMIN_PERMISSIONS.REPORTS_VIEW)
    async summary(@Req() req: any) {
        return this.adminReports.getSummary(req.adminUser.id);
    }

    @Get("assignees")
    @RequireAdminPermission(ADMIN_PERMISSIONS.REPORTS_ASSIGN)
    async searchAssignees(
        @Req() req: any,
        @Query() query: SearchAdminReportAssigneesDto,
    ) {
        return this.adminReports.searchAssignees(req.adminUser.id, query);
    }

    @Get()
    @RequireAdminPermission(ADMIN_PERMISSIONS.REPORTS_VIEW)
    async list(@Req() req: any, @Query() query: AdminReportsQueryDto) {
        return this.adminReports.list(req.adminUser.id, query);
    }

    @Get(":id")
    @RequireAdminPermission(ADMIN_PERMISSIONS.REPORTS_VIEW)
    async byId(@Req() req: any, @Param("id") id: string) {
        return this.adminReports.getById(
            req.adminUser.id,
            id,
            this.buildAuditContext(req),
        );
    }

    @Post(":id/status")
    @RequireAdminPermission(ADMIN_PERMISSIONS.REPORTS_RESOLVE)
    async updateStatus(
        @Req() req: any,
        @Param("id") id: string,
        @Body() body: UpdateAdminReportStatusDto,
    ) {
        return this.adminReports.updateStatus(
            req.adminUser.id,
            id,
            body,
            this.buildAuditContext(req),
        );
    }

    @Post(":id/assign")
    @RequireAdminPermission(ADMIN_PERMISSIONS.REPORTS_ASSIGN)
    async assign(
        @Req() req: any,
        @Param("id") id: string,
        @Body() body: AssignAdminReportDto,
    ) {
        return this.adminReports.assign(
            req.adminUser.id,
            id,
            body,
            this.buildAuditContext(req),
        );
    }

    @Post(":id/note")
    @RequireAdminPermission(ADMIN_PERMISSIONS.REPORTS_NOTE)
    async addNote(
        @Req() req: any,
        @Param("id") id: string,
        @Body() body: AddAdminReportNoteDto,
    ) {
        return this.adminReports.addNote(
            req.adminUser.id,
            id,
            body,
            this.buildAuditContext(req),
        );
    }

    @Post("bulk-status")
    @RequireAdminPermission(ADMIN_PERMISSIONS.REPORTS_BULK_UPDATE)
    async bulkUpdateStatus(
        @Req() req: any,
        @Body() body: BulkAdminReportStatusDto,
    ) {
        return this.adminReports.bulkUpdateStatus(
            req.adminUser.id,
            body,
            this.buildAuditContext(req),
        );
    }
}