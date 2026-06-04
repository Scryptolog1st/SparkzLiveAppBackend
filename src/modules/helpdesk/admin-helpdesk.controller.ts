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
    AddHelpdeskInternalNoteDto,
    AssignHelpdeskTicketDto,
    HelpdeskTicketQueryDto,
    ReplyHelpdeskTicketDto,
    UpdateHelpdeskTicketCategoryDto,
    UpdateHelpdeskTicketPriorityDto,
    UpdateHelpdeskTicketStatusDto,
    UpsertHelpdeskCategoryDto,
} from "./dto/helpdesk.dto";
import { HelpdeskService } from "./helpdesk.service";

type AdminRequestContext = {
    requestPath?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    deviceLabel?: string | null;
};

@Controller("admin/helpdesk")
@UseGuards(AdminProxyGuard, AdminPermissionGuard)
export class AdminHelpdeskController {
    constructor(private readonly helpdesk: HelpdeskService) { }

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
        const directIp = req.ip || req.socket?.remoteAddress || "";
        return this.normalizeOptionalString(directIp);
    }

    private buildAuditContext(req: Request): AdminRequestContext {
        const userAgent = this.normalizeOptionalString(this.getHeader(req, "user-agent"));

        return {
            requestPath: this.normalizeOptionalString(req.originalUrl || req.url || ""),
            ipAddress: this.extractIp(req),
            userAgent,
            deviceLabel: userAgent ? "Admin Dashboard Browser" : null,
        };
    }

    @Get("summary")
    @RequireAdminPermission(ADMIN_PERMISSIONS.HELPDESK_VIEW)
    async summary(@Req() req: any) {
        return this.helpdesk.getAdminSummary(req.adminUser.id);
    }

    @Get("categories")
    @RequireAdminPermission(ADMIN_PERMISSIONS.HELPDESK_VIEW)
    async categories() {
        return this.helpdesk.listAdminCategories();
    }

    @Post("categories")
    @RequireAdminPermission(ADMIN_PERMISSIONS.HELPDESK_MANAGE_CATEGORIES)
    async upsertCategory(
        @Req() req: any,
        @Body() body: UpsertHelpdeskCategoryDto,
    ) {
        return this.helpdesk.upsertCategory(
            req.adminUser.id,
            body,
            this.buildAuditContext(req),
        );
    }

    @Get("tickets")
    @RequireAdminPermission(ADMIN_PERMISSIONS.HELPDESK_VIEW)
    async listTickets(@Req() req: any, @Query() query: HelpdeskTicketQueryDto) {
        return this.helpdesk.listAdminTickets(req.adminUser.id, query);
    }

    @Get("tickets/:id")
    @RequireAdminPermission(ADMIN_PERMISSIONS.HELPDESK_VIEW)
    async getTicket(@Req() req: any, @Param("id") id: string) {
        return this.helpdesk.getAdminTicket(
            req.adminUser.id,
            id,
            this.buildAuditContext(req),
        );
    }

    @Post("tickets/:id/reply")
    @RequireAdminPermission(ADMIN_PERMISSIONS.HELPDESK_REPLY)
    async reply(
        @Req() req: any,
        @Param("id") id: string,
        @Body() body: ReplyHelpdeskTicketDto,
    ) {
        return this.helpdesk.addAdminReply(
            req.adminUser.id,
            id,
            body,
            this.buildAuditContext(req),
        );
    }

    @Post("tickets/:id/internal-notes")
    @RequireAdminPermission(ADMIN_PERMISSIONS.HELPDESK_CREATE_INTERNAL_NOTES)
    async addInternalNote(
        @Req() req: any,
        @Param("id") id: string,
        @Body() body: AddHelpdeskInternalNoteDto,
    ) {
        return this.helpdesk.addInternalNote(
            req.adminUser.id,
            id,
            body,
            this.buildAuditContext(req),
        );
    }

    @Post("tickets/:id/assign")
    @RequireAdminPermission(ADMIN_PERMISSIONS.HELPDESK_ASSIGN)
    async assign(
        @Req() req: any,
        @Param("id") id: string,
        @Body() body: AssignHelpdeskTicketDto,
    ) {
        return this.helpdesk.assignTicket(
            req.adminUser.id,
            id,
            body,
            this.buildAuditContext(req),
        );
    }

    @Post("tickets/:id/status")
    @RequireAdminPermission(ADMIN_PERMISSIONS.HELPDESK_ASSIGN)
    async updateStatus(
        @Req() req: any,
        @Param("id") id: string,
        @Body() body: UpdateHelpdeskTicketStatusDto,
    ) {
        return this.helpdesk.updateStatus(
            req.adminUser.id,
            id,
            body,
            this.buildAuditContext(req),
        );
    }

    @Post("tickets/:id/priority")
    @RequireAdminPermission(ADMIN_PERMISSIONS.HELPDESK_ASSIGN)
    async updatePriority(
        @Req() req: any,
        @Param("id") id: string,
        @Body() body: UpdateHelpdeskTicketPriorityDto,
    ) {
        return this.helpdesk.updatePriority(
            req.adminUser.id,
            id,
            body,
            this.buildAuditContext(req),
        );
    }

    @Post("tickets/:id/category")
    @RequireAdminPermission(ADMIN_PERMISSIONS.HELPDESK_ASSIGN)
    async updateCategory(
        @Req() req: any,
        @Param("id") id: string,
        @Body() body: UpdateHelpdeskTicketCategoryDto,
    ) {
        return this.helpdesk.updateCategory(
            req.adminUser.id,
            id,
            body,
            this.buildAuditContext(req),
        );
    }
}
