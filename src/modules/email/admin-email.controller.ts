import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Put,
    Query,
    Req,
    UseGuards,
} from "@nestjs/common";

import { AdminPermissionGuard } from "../admin-users/admin-permission.guard";
import { ADMIN_PERMISSIONS } from "../admin-users/admin-permissions";
import { AdminProxyGuard } from "../admin-users/admin-proxy.guard";
import { RequireAdminPermission } from "../admin-users/require-admin-permission.decorator";
import { EmailAdminService } from "./email-admin.service";
import {
    AdminEmailDeliveryLogsQueryDto,
    AdminEmailTemplatesQueryDto,
    AdminSmtpAccountsQueryDto,
    ArchiveEmailTemplateVersionDto,
    CreateEmailTemplateDraftDto,
    CreateSmtpAccountDto,
    RenderEmailTemplateVersionDto,
    SendEmailTemplateVersionTestDto,
    UpdateEmailTemplateDefinitionEditorDto,
    UpdateEmailTemplateVersionDto,
    UpdateSmtpAccountDto,
    UpdateSmtpAccountStatusDto,
    UpsertEmailCategoryMappingDto,
} from "./dto/admin-email.dto";

@Controller("admin/email")
@UseGuards(AdminProxyGuard, AdminPermissionGuard)
export class AdminEmailController {
    constructor(private readonly emailAdmin: EmailAdminService) { }

    @Get("overview")
    @RequireAdminPermission(ADMIN_PERMISSIONS.EMAIL_SETTINGS_VIEW)
    async getOverview(@Req() req: any) {
        return this.emailAdmin.getOverview(req.adminUser.id);
    }

    @Get("smtp-accounts")
    @RequireAdminPermission(ADMIN_PERMISSIONS.EMAIL_SMTP_VIEW)
    async listSmtpAccounts(
        @Req() req: any,
        @Query() query: AdminSmtpAccountsQueryDto,
    ) {
        return this.emailAdmin.listSmtpAccounts(req.adminUser.id, query);
    }

    @Post("smtp-accounts")
    @RequireAdminPermission(ADMIN_PERMISSIONS.EMAIL_SMTP_MANAGE)
    async createSmtpAccount(
        @Req() req: any,
        @Body() dto: CreateSmtpAccountDto,
    ) {
        return this.emailAdmin.createSmtpAccount(req.adminUser.id, dto);
    }

    @Patch("smtp-accounts/:id")
    @RequireAdminPermission(ADMIN_PERMISSIONS.EMAIL_SMTP_MANAGE)
    async updateSmtpAccount(
        @Req() req: any,
        @Param("id") id: string,
        @Body() dto: UpdateSmtpAccountDto,
    ) {
        return this.emailAdmin.updateSmtpAccount(req.adminUser.id, id, dto);
    }

    @Post("smtp-accounts/:id/status")
    @RequireAdminPermission(ADMIN_PERMISSIONS.EMAIL_SMTP_MANAGE)
    async updateSmtpAccountStatus(
        @Req() req: any,
        @Param("id") id: string,
        @Body() dto: UpdateSmtpAccountStatusDto,
    ) {
        return this.emailAdmin.updateSmtpAccountStatus(req.adminUser.id, id, dto);
    }

    @Post("smtp-accounts/:id/verify")
    @RequireAdminPermission(ADMIN_PERMISSIONS.EMAIL_SMTP_MANAGE)
    async verifySmtpAccount(@Req() req: any, @Param("id") id: string) {
        return this.emailAdmin.verifySmtpAccount(req.adminUser.id, id);
    }

    @Post("smtp-accounts/:id/test")
    @RequireAdminPermission(ADMIN_PERMISSIONS.EMAIL_SMTP_MANAGE)
    async sendSmtpTestEmail(@Req() req: any, @Param("id") id: string) {
        return this.emailAdmin.sendTestEmail(req.adminUser.id, id);
    }

    @Get("routes")
    @RequireAdminPermission(ADMIN_PERMISSIONS.EMAIL_SETTINGS_VIEW)
    async listCategoryMappings(@Req() req: any) {
        return this.emailAdmin.listCategoryMappings(req.adminUser.id);
    }

    @Put("routes/:category")
    @RequireAdminPermission(ADMIN_PERMISSIONS.EMAIL_SETTINGS_MANAGE)
    async upsertCategoryMapping(
        @Req() req: any,
        @Param("category") category: string,
        @Body() dto: UpsertEmailCategoryMappingDto,
    ) {
        return this.emailAdmin.upsertCategoryMapping(
            req.adminUser.id,
            category,
            dto,
        );
    }

    @Get("templates")
    @RequireAdminPermission(ADMIN_PERMISSIONS.EMAIL_TEMPLATES_VIEW)
    async listTemplateDefinitions(
        @Req() req: any,
        @Query() query: AdminEmailTemplatesQueryDto,
    ) {
        return this.emailAdmin.listTemplates(req.adminUser.id, query);
    }

    @Get("templates/:key")
    @RequireAdminPermission(ADMIN_PERMISSIONS.EMAIL_TEMPLATES_VIEW)
    async getTemplateDetail(@Req() req: any, @Param("key") key: string) {
        return this.emailAdmin.getTemplateDetail(req.adminUser.id, key);
    }

    @Post("templates/:key/draft")
    @RequireAdminPermission(ADMIN_PERMISSIONS.EMAIL_TEMPLATES_CREATE)
    async createTemplateDraft(
        @Req() req: any,
        @Param("key") key: string,
        @Body() dto: CreateEmailTemplateDraftDto,
    ) {
        return this.emailAdmin.createTemplateDraft(req.adminUser.id, key, dto);
    }

    @Patch("template-versions/:id")
    @RequireAdminPermission(ADMIN_PERMISSIONS.EMAIL_TEMPLATES_EDIT)
    async updateTemplateVersion(
        @Req() req: any,
        @Param("id") id: string,
        @Body() dto: UpdateEmailTemplateVersionDto,
    ) {
        return this.emailAdmin.updateTemplateVersion(req.adminUser.id, id, dto);
    }

    @Post("template-versions/:id/validate")
    @RequireAdminPermission(ADMIN_PERMISSIONS.EMAIL_TEMPLATES_PREVIEW)
    async validateTemplateVersion(
        @Req() req: any,
        @Param("id") id: string,
        @Body() dto: RenderEmailTemplateVersionDto,
    ) {
        return this.emailAdmin.validateTemplateVersion(req.adminUser.id, id, dto);
    }

    @Post("template-versions/:id/preview")
    @RequireAdminPermission(ADMIN_PERMISSIONS.EMAIL_TEMPLATES_PREVIEW)
    async previewTemplateVersion(
        @Req() req: any,
        @Param("id") id: string,
        @Body() dto: RenderEmailTemplateVersionDto,
    ) {
        return this.emailAdmin.previewTemplateVersion(req.adminUser.id, id, dto);
    }

    @Post("template-versions/:id/publish")
    @RequireAdminPermission(ADMIN_PERMISSIONS.EMAIL_TEMPLATES_PUBLISH)
    async publishTemplateVersion(@Req() req: any, @Param("id") id: string) {
        return this.emailAdmin.publishTemplateVersion(req.adminUser.id, id);
    }

    @Post("template-versions/:id/archive")
    @RequireAdminPermission(ADMIN_PERMISSIONS.EMAIL_TEMPLATES_ARCHIVE)
    async archiveTemplateVersion(
        @Req() req: any,
        @Param("id") id: string,
        @Body() dto: ArchiveEmailTemplateVersionDto,
    ) {
        return this.emailAdmin.archiveTemplateVersion(req.adminUser.id, id, dto);
    }

    @Post("template-versions/:id/send-test")
    @RequireAdminPermission(ADMIN_PERMISSIONS.EMAIL_TEMPLATES_SEND_TEST)
    async sendTemplateVersionTest(
        @Req() req: any,
        @Param("id") id: string,
        @Body() dto: SendEmailTemplateVersionTestDto,
    ) {
        return this.emailAdmin.sendTemplateVersionTest(req.adminUser.id, id, dto);
    }

    @Patch("templates/:key/editor")
    @RequireAdminPermission(ADMIN_PERMISSIONS.EMAIL_TEMPLATES_MANAGE)
    async updateTemplateDefinitionEditor(
        @Req() req: any,
        @Param("key") key: string,
        @Body() dto: UpdateEmailTemplateDefinitionEditorDto,
    ) {
        return this.emailAdmin.updateTemplateDefinitionEditor(
            req.adminUser.id,
            key,
            dto,
        );
    }

    @Get("logs")
    @RequireAdminPermission(ADMIN_PERMISSIONS.EMAIL_LOGS_VIEW)
    async listDeliveryLogs(
        @Req() req: any,
        @Query() query: AdminEmailDeliveryLogsQueryDto,
    ) {
        return this.emailAdmin.listDeliveryLogs(req.adminUser.id, query);
    }
}