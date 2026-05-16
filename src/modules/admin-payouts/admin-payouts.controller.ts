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
import {
    AdminPayoutRequestsQueryDto,
    AdminPayoutSummaryQueryDto,
    ApprovePayoutRequestDto,
    MarkPayoutFailedDto,
    MarkPayoutProcessingDto,
    RejectPayoutRequestDto,
    UpdatePayoutRequestNotesDto,
} from "./dto/admin-payouts.dto";
import { AdminPayoutsService } from "./admin-payouts.service";

type AdminRequestContext = {
    requestPath?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    deviceLabel?: string | null;
};

@Controller("admin/payouts")
@UseGuards(AdminProxyGuard, AdminPermissionGuard)
export class AdminPayoutsController {
    constructor(private readonly adminPayouts: AdminPayoutsService) { }

    private buildAuditContext(req: Request): AdminRequestContext {
        const forwardedFor = req.headers["x-forwarded-for"];
        const ipAddress = Array.isArray(forwardedFor)
            ? forwardedFor[0]
            : typeof forwardedFor === "string"
                ? forwardedFor.split(",")[0]?.trim()
                : req.socket?.remoteAddress ?? null;

        return {
            requestPath: req.originalUrl || req.url || null,
            ipAddress,
            userAgent:
                typeof req.headers["user-agent"] === "string"
                    ? req.headers["user-agent"]
                    : null,
            deviceLabel:
                typeof req.headers["x-device-label"] === "string"
                    ? req.headers["x-device-label"]
                    : null,
        };
    }

    @Get("requests")
    @RequireAdminPermission(ADMIN_PERMISSIONS.PAYOUTS_VIEW)
    async list(
        @Req() req: any,
        @Query() query: AdminPayoutRequestsQueryDto,
    ) {
        return this.adminPayouts.list(req.adminUser.id, query);
    }

    @Get("requests/:id")
    @RequireAdminPermission(ADMIN_PERMISSIONS.PAYOUTS_VIEW)
    async getById(
        @Req() req: any,
        @Param("id") id: string,
    ) {
        return this.adminPayouts.getById(req.adminUser.id, id);
    }

    @Post("requests/:id/notes")
    @RequireAdminPermission(ADMIN_PERMISSIONS.PAYOUTS_PROCESS)
    async updateNotes(
        @Req() req: any,
        @Param("id") id: string,
        @Body() body: UpdatePayoutRequestNotesDto,
    ) {
        return this.adminPayouts.updateNotes(
            req.adminUser.id,
            id,
            body,
            this.buildAuditContext(req),
        );
    }

    @Post("requests/:id/processing")
    @RequireAdminPermission(ADMIN_PERMISSIONS.PAYOUTS_PROCESS)
    async markProcessing(
        @Req() req: any,
        @Param("id") id: string,
        @Body() body: MarkPayoutProcessingDto,
    ) {
        return this.adminPayouts.markProcessing(
            req.adminUser.id,
            id,
            body,
            this.buildAuditContext(req),
        );
    }

    @Post("requests/:id/approve")
    @RequireAdminPermission(ADMIN_PERMISSIONS.PAYOUTS_APPROVE)
    async approve(
        @Req() req: any,
        @Param("id") id: string,
        @Body() body: ApprovePayoutRequestDto,
    ) {
        return this.adminPayouts.approve(
            req.adminUser.id,
            id,
            body,
            this.buildAuditContext(req),
        );
    }

    @Post("requests/:id/reject")
    @RequireAdminPermission(ADMIN_PERMISSIONS.PAYOUTS_REJECT)
    async reject(
        @Req() req: any,
        @Param("id") id: string,
        @Body() body: RejectPayoutRequestDto,
    ) {
        return this.adminPayouts.reject(
            req.adminUser.id,
            id,
            body,
            this.buildAuditContext(req),
        );
    }

    @Post("requests/:id/fail")
    @RequireAdminPermission(ADMIN_PERMISSIONS.PAYOUTS_FAIL_RELEASE)
    async markFailed(
        @Req() req: any,
        @Param("id") id: string,
        @Body() body: MarkPayoutFailedDto,
    ) {
        return this.adminPayouts.markFailedAndRelease(
            req.adminUser.id,
            id,
            body,
            this.buildAuditContext(req),
        );
    }

    @Get("summary")
    @RequireAdminPermission(ADMIN_PERMISSIONS.PAYOUTS_VIEW)
    async summary(
        @Req() req: any,
        @Query() query: AdminPayoutSummaryQueryDto,
    ) {
        return this.adminPayouts.getSummary(req.adminUser.id, query);
    }
}
