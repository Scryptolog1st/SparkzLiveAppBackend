import {
    UnauthorizedException,
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    Req,
    UseGuards,
} from "@nestjs/common";
import type { Request } from "express";

type AdminRequestWithUser = Request & {
    adminUser?: {
        id: string;
    };
};


import { AdminPermissionGuard } from "../admin-users/admin-permission.guard";
import { ADMIN_PERMISSIONS } from "../admin-users/admin-permissions";
import { AdminProxyGuard } from "../admin-users/admin-proxy.guard";
import { RequireAdminPermission } from "../admin-users/require-admin-permission.decorator";
import {
    AddHelpdeskInternalNoteDto,
    AssignHelpdeskTicketDto,
    CloseHelpdeskLiveChatDto,
    ConvertHelpdeskLiveChatToTicketDto,
    CreateAdminHelpdeskTicketDto,
    HelpdeskLiveChatQueryDto,
    HelpdeskTicketQueryDto,
    ReplyHelpdeskLiveChatDto,
    ReplyHelpdeskTicketDto,
    UpdateHelpdeskTicketCategoryDto,
    UpdateHelpdeskTicketPriorityDto,
    UpdateHelpdeskTicketStatusDto,
    UpsertHelpdeskCategoryDto,
    UpdateHelpdeskCategoryDto,
    DeactivateHelpdeskCategoryDto,
} from "./dto/helpdesk.dto";
import { HelpdeskPhase2Service } from "./helpdesk-phase2.service";
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

    private requireAdminUserId(req: AdminRequestWithUser) {
        if (!req.adminUser?.id) {
            throw new UnauthorizedException("Admin authentication required.");
        }

        return req.adminUser.id;
    }

    constructor(
        private readonly helpdesk: HelpdeskService,
        private readonly phase2: HelpdeskPhase2Service,
    ) { }

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

    @Patch("categories/:id")
    async updateCategoryRecord(
        @Param("id") id: string,
        @Body() body: UpdateHelpdeskCategoryDto,
        @Req() req: AdminRequestWithUser,
    ) {
        return this.helpdesk.updateHelpdeskCategoryRecord(
            this.requireAdminUserId(req),
            id,
            body,
            this.buildAuditContext(req),
        );
    }

    @Delete("categories/:id")
    async deactivateCategoryRecord(
        @Param("id") id: string,
        @Body() body: DeactivateHelpdeskCategoryDto,
        @Req() req: AdminRequestWithUser,
    ) {
        return this.helpdesk.deactivateHelpdeskCategoryRecord(
            this.requireAdminUserId(req),
            id,
            body,
            this.buildAuditContext(req),
        );
    }

    @Post("categories/:id/restore")
    async restoreCategoryRecord(@Param("id") id: string, @Req() req: AdminRequestWithUser) {
        return this.helpdesk.restoreHelpdeskCategoryRecord(
            this.requireAdminUserId(req),
            id,
            this.buildAuditContext(req),
        );
    }

    @Post("tickets")
    @RequireAdminPermission(ADMIN_PERMISSIONS.HELPDESK_CREATE_TICKETS)
    async createTicket(
        @Req() req: any,
        @Body() body: CreateAdminHelpdeskTicketDto,
    ) {
        return this.phase2.createAdminTicket(
            req.adminUser.id,
            body,
            this.buildAuditContext(req),
        );
    }

    @Get("live-chat/threads")
    @RequireAdminPermission(ADMIN_PERMISSIONS.HELPDESK_LIVE_CHAT_VIEW)
    async listLiveChatThreads(
        @Req() req: any,
        @Query() query: HelpdeskLiveChatQueryDto,
    ) {
        return this.phase2.listAdminLiveChatThreads(req.adminUser.id, query);
    }

    @Get("live-chat/threads/:id")
    @RequireAdminPermission(ADMIN_PERMISSIONS.HELPDESK_LIVE_CHAT_VIEW)
    async getLiveChatThread(@Req() req: any, @Param("id") id: string) {
        return this.phase2.getAdminLiveChatThread(req.adminUser.id, id);
    }

    @Post("live-chat/threads/:id/claim")
    @RequireAdminPermission(ADMIN_PERMISSIONS.HELPDESK_LIVE_CHAT_MANAGE)
    async claimLiveChatThread(@Req() req: any, @Param("id") id: string) {
        return this.phase2.claimLiveChatThread(
            req.adminUser.id,
            id,
            this.buildAuditContext(req),
        );
    }

    @Post("live-chat/threads/:id/release")
    @RequireAdminPermission(ADMIN_PERMISSIONS.HELPDESK_LIVE_CHAT_MANAGE)
    async releaseLiveChatThread(@Req() req: any, @Param("id") id: string) {
        return this.phase2.releaseLiveChatThread(
            req.adminUser.id,
            id,
            this.buildAuditContext(req),
        );
    }

    @Post("live-chat/threads/:id/messages")
    @RequireAdminPermission(ADMIN_PERMISSIONS.HELPDESK_LIVE_CHAT_MANAGE)
    async sendLiveChatMessage(
        @Req() req: any,
        @Param("id") id: string,
        @Body() body: ReplyHelpdeskLiveChatDto,
    ) {
        return this.phase2.addAdminLiveChatMessage(
            req.adminUser.id,
            id,
            body,
            this.buildAuditContext(req),
        );
    }

    @Post("live-chat/threads/:id/close")
    @RequireAdminPermission(ADMIN_PERMISSIONS.HELPDESK_LIVE_CHAT_MANAGE)
    async closeLiveChatThread(
        @Req() req: any,
        @Param("id") id: string,
        @Body() body: CloseHelpdeskLiveChatDto,
    ) {
        return this.phase2.closeLiveChatThread(
            req.adminUser.id,
            id,
            body,
            this.buildAuditContext(req),
        );
    }

    @Post("live-chat/threads/:id/convert-to-ticket")
    @RequireAdminPermission(ADMIN_PERMISSIONS.HELPDESK_LIVE_CHAT_MANAGE)
    async convertLiveChatToTicket(
        @Req() req: any,
        @Param("id") id: string,
        @Body() body: ConvertHelpdeskLiveChatToTicketDto,
    ) {
        return this.phase2.convertLiveChatToTicket(
            req.adminUser.id,
            id,
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
