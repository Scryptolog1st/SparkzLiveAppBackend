import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma, type AdminRole } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import {
    ADMIN_PERMISSIONS,
    hasAdminPermission,
    type AdminPermission,
} from "../admin-users/admin-permissions";
import { AdminRolePermissionsService } from "../admin-users/admin-role-permissions.service";
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
import { EmailCryptoService } from "./email-crypto.service";
import { EmailTemplateDefinitionService } from "./email-template-definition.service";
import { EmailTemplateRendererService } from "./email-template-renderer.service";
import {
    buildDefaultSampleVariables,
    buildDefaultTemplateSource,
    getEmailTemplateCatalogEntry,
} from "./email-template-catalog";
import { EMAIL_CATEGORY_VALUES } from "./email.constants";
import { EmailTransportService } from "./email-transport.service";

@Injectable()
export class EmailAdminService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
        private readonly rolePermissions: AdminRolePermissionsService,
        private readonly crypto: EmailCryptoService,
        private readonly transport: EmailTransportService,
        private readonly templateDefinitions: EmailTemplateDefinitionService,
        private readonly renderer: EmailTemplateRendererService,
    ) { }

    private normalizePage(value: string | number | undefined, fallback: number) {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed < 1) {
            return fallback;
        }

        return Math.floor(parsed);
    }

    private normalizePageSize(
        value: string | number | undefined,
        fallback: number,
    ) {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed < 1) {
            return fallback;
        }

        return Math.min(100, Math.floor(parsed));
    }

    private normalizeOptionalString(value?: string | null) {
        const normalized = String(value || "").trim();
        return normalized ? normalized : null;
    }

    private sanitizeHeaderValue(value?: string | null) {
        return String(value || "")
            .replace(/[\r\n]+/g, " ")
            .trim();
    }

    private shortMask(value?: string | null) {
        const raw = String(value || "").trim();
        if (!raw) return null;

        if (raw.includes("@")) {
            const [local, domain] = raw.split("@");
            const visible = local.slice(0, Math.min(2, local.length));
            return `${visible}***@${domain}`;
        }

        if (raw.length <= 4) {
            return `${raw[0] ?? "*"}***`;
        }

        return `${raw.slice(0, 2)}***${raw.slice(-2)}`;
    }

    private truncate(value: string | null | undefined, max: number) {
        const normalized = String(value || "");
        return normalized.length <= max
            ? normalized
            : normalized.slice(0, max);
    }

    private jsonObject(value: Prisma.JsonValue | null | undefined) {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            return {};
        }

        return value as Record<string, unknown>;
    }

    private jsonStringArray(value: Prisma.JsonValue | null | undefined) {
        if (!Array.isArray(value)) {
            return [];
        }

        return value
            .map((item) => String(item || "").trim())
            .filter(Boolean);
    }

    private async requireAdmin(adminUserId: string) {
        const adminUser = await this.prisma.adminUser.findUnique({
            where: { id: adminUserId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
            },
        });

        if (!adminUser) {
            throw new UnauthorizedException("Admin account not found.");
        }

        if (!adminUser.isActive) {
            throw new ForbiddenException("Admin account is inactive.");
        }

        return adminUser;
    }

    private async getEffectivePermissions(adminUserId: string) {
        const adminUser = await this.requireAdmin(adminUserId);
        const permissions = await this.rolePermissions.getEffectivePermissions(
            adminUser.role as AdminRole,
        );

        return { adminUser, permissions };
    }

    private async requirePermission(
        adminUserId: string,
        permission: AdminPermission,
    ) {
        const { adminUser, permissions } = await this.getEffectivePermissions(adminUserId);

        if (!hasAdminPermission(permissions, permission)) {
            throw new ForbiddenException(`Missing permission: ${permission}`);
        }

        return adminUser;
    }

    private async requireAnyPermission(
        adminUserId: string,
        requiredPermissions: AdminPermission[],
    ) {
        const { adminUser, permissions } = await this.getEffectivePermissions(adminUserId);

        if (!requiredPermissions.some((permission) => hasAdminPermission(permissions, permission))) {
            throw new ForbiddenException(
                `Missing one of required permissions: ${requiredPermissions.join(", ")}`,
            );
        }

        return adminUser;
    }

    private mapSmtpAccount(row: any) {
        return {
            id: row.id,
            label: row.label,
            host: row.host,
            port: row.port,
            secure: row.secure,
            usernameMasked: this.shortMask(row.username),
            fromName: row.fromName,
            fromEmail: row.fromEmail,
            replyToEmail: row.replyToEmail ?? null,
            status: row.status,
            priority: row.priority,
            notes: row.notes ?? null,
            lastVerifiedAt: row.lastVerifiedAt
                ? row.lastVerifiedAt.toISOString()
                : null,
            lastHealthcheckAt: row.lastHealthcheckAt
                ? row.lastHealthcheckAt.toISOString()
                : null,
            lastError: row.lastError ?? null,
            categories: Array.isArray(row.categoryMappings)
                ? row.categoryMappings.map((item: any) => item.category)
                : [],
            createdAt: row.createdAt.toISOString(),
            updatedAt: row.updatedAt.toISOString(),
        };
    }

    private async requireSmtpAccount(id: string) {
        const row = await this.prisma.smtpAccount.findUnique({
            where: { id },
            include: {
                categoryMappings: {
                    select: {
                        id: true,
                        category: true,
                    },
                },
            },
        });

        if (!row) {
            throw new NotFoundException("SMTP account not found.");
        }

        return row;
    }

    private getFallbackSmtpAccountId() {
        const raw = this.config.get<string>("EMAIL_EMERGENCY_FALLBACK_SMTP_ACCOUNT_ID");
        const normalized = String(raw || "").trim();
        return normalized || null;
    }

    private async resolveSmtpAccountForCategory(category: string) {
        const mapping = await this.prisma.emailCategoryMapping.findUnique({
            where: {
                category: category as any,
            },
            include: {
                smtpAccount: true,
            },
        });

        if (mapping?.smtpAccount) {
            return mapping.smtpAccount;
        }

        const fallbackSmtpAccountId = this.getFallbackSmtpAccountId();
        if (!fallbackSmtpAccountId) {
            return null;
        }

        return this.prisma.smtpAccount.findUnique({
            where: { id: fallbackSmtpAccountId },
        });
    }

    private mapTemplateVersionSummary(version: any) {
        if (!version) {
            return null;
        }

        return {
            id: version.id,
            version: version.version,
            status: version.status,
            compiledAt: version.compiledAt ? version.compiledAt.toISOString() : null,
            createdAt: version.createdAt.toISOString(),
            updatedAt: version.updatedAt.toISOString(),
            archivedAt: version.archivedAt ? version.archivedAt.toISOString() : null,
        };
    }

    private mapTemplateVersionDetail(version: any) {
        if (!version) {
            return null;
        }

        return {
            id: version.id,
            version: version.version,
            status: version.status,
            subject: version.subject,
            markupSource: version.markupSource,
            textBodySource: version.textBodySource ?? "",
            htmlBodyCompiled: version.htmlBodyCompiled,
            textBodyCompiled: version.textBodyCompiled,
            placeholders: this.jsonStringArray(version.placeholders),
            validationErrors: Array.isArray(version.validationErrorsJson)
                ? version.validationErrorsJson
                : [],
            compiledAt: version.compiledAt ? version.compiledAt.toISOString() : null,
            createdAt: version.createdAt.toISOString(),
            updatedAt: version.updatedAt.toISOString(),
            archivedAt: version.archivedAt ? version.archivedAt.toISOString() : null,
            createdByAdminUserId: version.createdByAdminUserId ?? null,
            updatedByAdminUserId: version.updatedByAdminUserId ?? null,
        };
    }

    private mapTemplateSummary(definition: any, legacyTemplate: any | null) {
        const versions = Array.isArray(definition.versions) ? definition.versions : [];
        const publishedVersion =
            definition.publishedVersion ??
            versions.find((version: any) => version.status === "PUBLISHED") ??
            null;
        const draftVersion =
            versions.find(
                (version: any) => version.status === "DRAFT" && !version.archivedAt,
            ) ?? null;

        const timestamps = [
            definition.updatedAt?.getTime?.() ?? 0,
            publishedVersion?.updatedAt?.getTime?.() ?? 0,
            draftVersion?.updatedAt?.getTime?.() ?? 0,
            legacyTemplate?.updatedAt?.getTime?.() ?? 0,
        ].filter(Boolean);

        const updatedAt = new Date(Math.max(...timestamps));

        return {
            id: definition.id,
            key: definition.key,
            category: definition.category,
            name: definition.name,
            description: definition.description ?? null,
            editorType: definition.editorType,
            publishedVersion: this.mapTemplateVersionSummary(publishedVersion),
            draftVersion: this.mapTemplateVersionSummary(draftVersion),
            legacyTemplate: legacyTemplate
                ? {
                    id: legacyTemplate.id,
                    key: legacyTemplate.key,
                    status: legacyTemplate.status,
                    version: legacyTemplate.version,
                    updatedAt: legacyTemplate.updatedAt.toISOString(),
                }
                : null,
            updatedAt: updatedAt.toISOString(),
        };
    }

    private mapTemplateDetail(definition: any, legacyTemplate: any | null) {
        const versions = Array.isArray(definition.versions) ? definition.versions : [];
        const publishedVersion =
            definition.publishedVersion ??
            versions.find((version: any) => version.status === "PUBLISHED") ??
            null;
        const draftVersion =
            versions.find(
                (version: any) => version.status === "DRAFT" && !version.archivedAt,
            ) ?? null;

        return {
            definition: {
                id: definition.id,
                key: definition.key,
                category: definition.category,
                name: definition.name,
                description: definition.description ?? null,
                editorType: definition.editorType,
                allowedVariables: Array.isArray(definition.allowedVariables)
                    ? definition.allowedVariables
                    : [],
                requiredVariables: this.jsonStringArray(definition.requiredVariables),
                sampleVariables: this.jsonObject(definition.sampleVariables),
                publishedVersionId: definition.publishedVersionId ?? null,
                publishedVersion: this.mapTemplateVersionSummary(publishedVersion),
                draftVersion: this.mapTemplateVersionSummary(draftVersion),
                legacyTemplate: legacyTemplate
                    ? {
                        id: legacyTemplate.id,
                        key: legacyTemplate.key,
                        status: legacyTemplate.status,
                        version: legacyTemplate.version,
                        subject: legacyTemplate.subject,
                        updatedAt: legacyTemplate.updatedAt.toISOString(),
                    }
                    : null,
                createdAt: definition.createdAt.toISOString(),
                updatedAt: definition.updatedAt.toISOString(),
            },
            live: this.mapTemplateVersionDetail(publishedVersion),
            draft: this.mapTemplateVersionDetail(draftVersion),
            versions: versions.map((version: any) => this.mapTemplateVersionDetail(version)),
        };
    }

    private async getLegacyActiveTemplate(category: string) {
        return this.prisma.emailTemplate.findFirst({
            where: {
                category: category as any,
                status: "ACTIVE" as any,
            },
            orderBy: [{ updatedAt: "desc" }, { version: "desc" }, { createdAt: "desc" }],
        });
    }

    async getOverview(adminUserId: string) {
        await this.requirePermission(adminUserId, ADMIN_PERMISSIONS.EMAIL_SETTINGS_VIEW);
        await this.templateDefinitions.ensureSeeded();

        const categories = [...EMAIL_CATEGORY_VALUES];
        const fallbackSmtpAccountId = this.getFallbackSmtpAccountId();

        const [
            accounts,
            routes,
            definitions,
            totalLogs,
            queuedLogs,
            sendingLogs,
            sentLogs,
            failedLogs,
            failedLast24Hours,
        ] = await Promise.all([
            this.prisma.smtpAccount.findMany({
                include: {
                    categoryMappings: {
                        select: {
                            category: true,
                        },
                    },
                },
                orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
            }),
            this.prisma.emailCategoryMapping.findMany({
                orderBy: { category: "asc" },
            }),
            this.prisma.emailTemplateDefinition.findMany({
                where: { archivedAt: null },
                include: {
                    versions: true,
                    publishedVersion: true,
                },
            }),
            this.prisma.emailDeliveryLog.count(),
            this.prisma.emailDeliveryLog.count({
                where: { status: "QUEUED" as any },
            }),
            this.prisma.emailDeliveryLog.count({
                where: { status: "SENDING" as any },
            }),
            this.prisma.emailDeliveryLog.count({
                where: { status: "SENT" as any },
            }),
            this.prisma.emailDeliveryLog.count({
                where: {
                    status: {
                        in: ["FAILED", "BOUNCED"] as any,
                    },
                },
            }),
            this.prisma.emailDeliveryLog.count({
                where: {
                    status: {
                        in: ["FAILED", "BOUNCED"] as any,
                    },
                    createdAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                    },
                },
            }),
        ]);

        const routeMap = new Map(routes.map((row) => [row.category, row]));
        const mappedCount = categories.filter((category) =>
            Boolean(routeMap.get(category)?.smtpAccountId),
        ).length;

        const statusCounts = {
            active: accounts.filter((item) => item.status === "ACTIVE").length,
            disabled: accounts.filter((item) => item.status === "DISABLED").length,
            failing: accounts.filter((item) => item.status === "FAILING").length,
            archived: accounts.filter((item) => item.status === "ARCHIVED").length,
        };

        const publishedDefinitions = definitions.filter(
            (item) => Boolean(item.publishedVersionId),
        ).length;
        const draftDefinitions = definitions.filter((item) =>
            item.versions.some(
                (version) => version.status === ("DRAFT" as any) && !version.archivedAt,
            ),
        ).length;

        return {
            counts: {
                smtpAccounts: {
                    total: accounts.length,
                    ...statusCounts,
                },
                categoryMappings: {
                    totalCategories: categories.length,
                    mapped: mappedCount,
                    unmapped: categories.length - mappedCount,
                },
                templates: {
                    total: definitions.length,
                    active: publishedDefinitions,
                    draft: draftDefinitions,
                },
                deliveryLogs: {
                    total: totalLogs,
                    queued: queuedLogs,
                    sending: sendingLogs,
                    sent: sentLogs,
                    failed: failedLogs,
                    failedLast24Hours,
                },
            },
            fallbackSmtpAccountId,
            generatedAt: new Date().toISOString(),
        };
    }

    async listSmtpAccounts(
        adminUserId: string,
        query: AdminSmtpAccountsQueryDto = {},
    ) {
        await this.requirePermission(adminUserId, ADMIN_PERMISSIONS.EMAIL_SMTP_VIEW);

        const page = this.normalizePage(query.page, 1);
        const pageSize = this.normalizePageSize(query.pageSize, 20);
        const search = String(query.search || "").trim();
        const status = this.normalizeOptionalString(query.status);

        const where: Prisma.SmtpAccountWhereInput = {};

        if (status) {
            where.status = status as any;
        }

        if (search) {
            where.OR = [
                { label: { contains: search, mode: "insensitive" } },
                { host: { contains: search, mode: "insensitive" } },
                { username: { contains: search, mode: "insensitive" } },
                { fromEmail: { contains: search, mode: "insensitive" } },
                { replyToEmail: { contains: search, mode: "insensitive" } },
            ];
        }

        const [total, items] = await Promise.all([
            this.prisma.smtpAccount.count({ where }),
            this.prisma.smtpAccount.findMany({
                where,
                include: {
                    categoryMappings: {
                        select: {
                            category: true,
                        },
                    },
                },
                orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
        ]);

        return {
            items: items.map((row) => this.mapSmtpAccount(row)),
            total,
            page,
            pageSize,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
        };
    }

    async createSmtpAccount(adminUserId: string, dto: CreateSmtpAccountDto) {
        await this.requirePermission(adminUserId, ADMIN_PERMISSIONS.EMAIL_SMTP_MANAGE);

        const created = await this.prisma.smtpAccount.create({
            data: {
                label: this.sanitizeHeaderValue(dto.label),
                host: String(dto.host).trim(),
                port: dto.port,
                secure: dto.secure,
                username: String(dto.username).trim(),
                encryptedPassword: this.crypto.encrypt(dto.password),
                fromName: this.sanitizeHeaderValue(dto.fromName),
                fromEmail: this.sanitizeHeaderValue(dto.fromEmail).toLowerCase(),
                replyToEmail: this.normalizeOptionalString(dto.replyToEmail)?.toLowerCase() ?? null,
                status: (dto.status || "DISABLED") as any,
                priority: typeof dto.priority === "number" ? dto.priority : 100,
                notes: this.normalizeOptionalString(dto.notes),
            },
            include: {
                categoryMappings: {
                    select: {
                        category: true,
                    },
                },
            },
        });

        return {
            success: true,
            item: this.mapSmtpAccount(created),
        };
    }

    async updateSmtpAccount(
        adminUserId: string,
        id: string,
        dto: UpdateSmtpAccountDto,
    ) {
        await this.requirePermission(adminUserId, ADMIN_PERMISSIONS.EMAIL_SMTP_MANAGE);
        await this.requireSmtpAccount(id);

        const data: Prisma.SmtpAccountUpdateInput = {};

        if (typeof dto.label === "string") {
            data.label = this.sanitizeHeaderValue(dto.label);
        }

        if (typeof dto.host === "string") {
            data.host = String(dto.host).trim();
        }

        if (typeof dto.port === "number") {
            data.port = dto.port;
        }

        if (typeof dto.secure === "boolean") {
            data.secure = dto.secure;
        }

        if (typeof dto.username === "string") {
            data.username = String(dto.username).trim();
        }

        if (typeof dto.password === "string" && dto.password.trim()) {
            data.encryptedPassword = this.crypto.encrypt(dto.password);
        }

        if (typeof dto.fromName === "string") {
            data.fromName = this.sanitizeHeaderValue(dto.fromName);
        }

        if (typeof dto.fromEmail === "string") {
            data.fromEmail = this.sanitizeHeaderValue(dto.fromEmail).toLowerCase();
        }

        if (dto.replyToEmail !== undefined) {
            data.replyToEmail =
                this.normalizeOptionalString(dto.replyToEmail)?.toLowerCase() ?? null;
        }

        if (typeof dto.priority === "number") {
            data.priority = dto.priority;
        }

        if (dto.notes !== undefined) {
            data.notes = this.normalizeOptionalString(dto.notes);
        }

        const updated = await this.prisma.smtpAccount.update({
            where: { id },
            data,
            include: {
                categoryMappings: {
                    select: {
                        category: true,
                    },
                },
            },
        });

        return {
            success: true,
            item: this.mapSmtpAccount(updated),
        };
    }

    async updateSmtpAccountStatus(
        adminUserId: string,
        id: string,
        dto: UpdateSmtpAccountStatusDto,
    ) {
        await this.requirePermission(adminUserId, ADMIN_PERMISSIONS.EMAIL_SMTP_MANAGE);
        await this.requireSmtpAccount(id);

        const updated = await this.prisma.smtpAccount.update({
            where: { id },
            data: {
                status: dto.status as any,
            },
            include: {
                categoryMappings: {
                    select: {
                        category: true,
                    },
                },
            },
        });

        return {
            success: true,
            item: this.mapSmtpAccount(updated),
        };
    }

    async verifySmtpAccount(adminUserId: string, id: string) {
        await this.requirePermission(adminUserId, ADMIN_PERMISSIONS.EMAIL_SMTP_MANAGE);

        const account = await this.requireSmtpAccount(id);

        try {
            await this.transport.verify(account);

            const updated = await this.prisma.smtpAccount.update({
                where: { id },
                data: {
                    lastVerifiedAt: new Date(),
                    lastHealthcheckAt: new Date(),
                    lastError: null,
                    status:
                        account.status === "FAILING" ? ("ACTIVE" as any) : undefined,
                },
                include: {
                    categoryMappings: {
                        select: {
                            category: true,
                        },
                    },
                },
            });

            return {
                success: true,
                item: this.mapSmtpAccount(updated),
            };
        } catch (error) {
            const message =
                error instanceof Error ? error.message.slice(0, 2000) : "SMTP verification failed.";

            const updated = await this.prisma.smtpAccount.update({
                where: { id },
                data: {
                    lastHealthcheckAt: new Date(),
                    lastError: message,
                    status:
                        account.status === "ACTIVE" ? ("FAILING" as any) : account.status,
                },
                include: {
                    categoryMappings: {
                        select: {
                            category: true,
                        },
                    },
                },
            });

            throw new BadRequestException({
                message: "SMTP verification failed.",
                error: message,
                item: this.mapSmtpAccount(updated),
            });
        }
    }

    async sendTestEmail(adminUserId: string, id: string) {
        const adminUser = await this.requirePermission(
            adminUserId,
            ADMIN_PERMISSIONS.EMAIL_SMTP_MANAGE,
        );

        const account = await this.requireSmtpAccount(id);

        const subjectPrefix = String(
            this.config.get<string>("EMAIL_TEST_SUBJECT_PREFIX") || "[SparkzLive Email Test]",
        ).trim();

        const subject = `${subjectPrefix} ${account.label}`;
        const text = [
            "This is a SparkzLive SMTP test email.",
            "",
            `Account: ${account.label}`,
            `Host: ${account.host}:${account.port}`,
            `Secure: ${account.secure ? "true" : "false"}`,
            `Triggered by: ${adminUser.email}`,
            `Triggered at: ${new Date().toISOString()}`,
        ].join("\n");

        const html = [
            "<div style=\"font-family:Arial,sans-serif;line-height:1.6;color:#111\">",
            "<h2>SparkzLive SMTP Test Email</h2>",
            `<p><strong>Account:</strong> ${account.label}</p>`,
            `<p><strong>Host:</strong> ${account.host}:${account.port}</p>`,
            `<p><strong>Secure:</strong> ${account.secure ? "true" : "false"}</p>`,
            `<p><strong>Triggered by:</strong> ${adminUser.email}</p>`,
            `<p><strong>Triggered at:</strong> ${new Date().toISOString()}</p>`,
            "</div>",
        ].join("");

        const log = await this.prisma.emailDeliveryLog.create({
            data: {
                category: "ADMIN_MANUAL_MESSAGE" as any,
                smtpAccountId: account.id,
                recipientEmail: adminUser.email,
                subjectSnapshot: subject,
                htmlSnapshot: html,
                textSnapshot: text,
                status: "SENDING" as any,
                initiatedByAdminUserId: adminUser.id,
                correlationJson: {
                    type: "smtp_test_send",
                    smtpAccountId: account.id,
                } as Prisma.InputJsonValue,
                lastAttemptAt: new Date(),
            },
        });

        try {
            const info = await this.transport.sendTestEmail(
                account,
                adminUser.email,
                subject,
                text,
                html,
            );

            await Promise.all([
                this.prisma.emailDeliveryLog.update({
                    where: { id: log.id },
                    data: {
                        status: "SENT" as any,
                        providerMessageId: info.messageId ?? null,
                        providerResponse:
                            typeof info.response === "string" ? info.response : JSON.stringify(info),
                        sentAt: new Date(),
                        lastAttemptAt: new Date(),
                    },
                }),
                this.prisma.smtpAccount.update({
                    where: { id: account.id },
                    data: {
                        lastHealthcheckAt: new Date(),
                        lastError: null,
                        status:
                            account.status === "FAILING" ? ("ACTIVE" as any) : undefined,
                    },
                }),
            ]);

            return {
                success: true,
                logId: log.id,
                recipientEmail: adminUser.email,
                messageId: info.messageId ?? null,
                response:
                    typeof info.response === "string" ? info.response : null,
            };
        } catch (error) {
            const message =
                error instanceof Error ? error.message.slice(0, 4000) : "SMTP test send failed.";

            await Promise.all([
                this.prisma.emailDeliveryLog.update({
                    where: { id: log.id },
                    data: {
                        status: "FAILED" as any,
                        errorMessage: message,
                        lastAttemptAt: new Date(),
                    },
                }),
                this.prisma.smtpAccount.update({
                    where: { id: account.id },
                    data: {
                        lastHealthcheckAt: new Date(),
                        lastError: message,
                        status:
                            account.status === "ACTIVE" ? ("FAILING" as any) : account.status,
                    },
                }),
            ]);

            throw new BadRequestException({
                message: "SMTP test send failed.",
                error: message,
                logId: log.id,
            });
        }
    }

    async listCategoryMappings(adminUserId: string) {
        await this.requirePermission(adminUserId, ADMIN_PERMISSIONS.EMAIL_SETTINGS_VIEW);

        const fallbackSmtpAccountId = this.getFallbackSmtpAccountId();

        const [accounts, mappings] = await Promise.all([
            this.prisma.smtpAccount.findMany({
                where: {
                    status: {
                        not: "ARCHIVED" as any,
                    },
                },
                select: {
                    id: true,
                    label: true,
                    status: true,
                    priority: true,
                },
                orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
            }),
            this.prisma.emailCategoryMapping.findMany({
                orderBy: { category: "asc" },
            }),
        ]);

        const accountMap = new Map(accounts.map((item) => [item.id, item]));
        const mappingMap = new Map(mappings.map((item) => [item.category, item]));
        const fallbackAccount = fallbackSmtpAccountId
            ? accountMap.get(fallbackSmtpAccountId) ?? null
            : null;

        return {
            fallbackSmtpAccountId,
            accounts,
            items: EMAIL_CATEGORY_VALUES.map((category) => {
                const mapping = mappingMap.get(category);
                const mappedAccount = mapping?.smtpAccountId
                    ? accountMap.get(mapping.smtpAccountId) ?? null
                    : null;

                const resolvedAccount = mappedAccount ?? fallbackAccount;

                return {
                    category,
                    smtpAccountId: mapping?.smtpAccountId ?? null,
                    smtpAccountLabel: mappedAccount?.label ?? null,
                    resolvedSmtpAccountId: resolvedAccount?.id ?? null,
                    resolvedSmtpAccountLabel: resolvedAccount?.label ?? null,
                    resolution: mappedAccount
                        ? "mapping"
                        : resolvedAccount
                            ? "env_fallback"
                            : "unassigned",
                };
            }),
        };
    }

    async upsertCategoryMapping(
        adminUserId: string,
        category: string,
        dto: UpsertEmailCategoryMappingDto,
    ) {
        await this.requirePermission(adminUserId, ADMIN_PERMISSIONS.EMAIL_SETTINGS_MANAGE);

        if (!EMAIL_CATEGORY_VALUES.includes(category as any)) {
            throw new BadRequestException("Invalid email category.");
        }

        const smtpAccountId = this.normalizeOptionalString(dto.smtpAccountId);

        if (!smtpAccountId) {
            await this.prisma.emailCategoryMapping.deleteMany({
                where: {
                    category: category as any,
                },
            });

            return {
                success: true,
                category,
                smtpAccountId: null,
            };
        }

        const account = await this.prisma.smtpAccount.findUnique({
            where: { id: smtpAccountId },
            select: {
                id: true,
                status: true,
                label: true,
            },
        });

        if (!account) {
            throw new NotFoundException("SMTP account not found.");
        }

        if (account.status === "ARCHIVED") {
            throw new BadRequestException("Archived SMTP accounts cannot be assigned.");
        }

        const updated = await this.prisma.emailCategoryMapping.upsert({
            where: {
                category: category as any,
            },
            update: {
                smtpAccountId: account.id,
            },
            create: {
                category: category as any,
                smtpAccountId: account.id,
            },
        });

        return {
            success: true,
            category: updated.category,
            smtpAccountId: updated.smtpAccountId,
            smtpAccountLabel: account.label,
        };
    }

    async listTemplates(
        adminUserId: string,
        query: AdminEmailTemplatesQueryDto = {},
    ) {
        await this.requirePermission(adminUserId, ADMIN_PERMISSIONS.EMAIL_TEMPLATES_VIEW);
        await this.templateDefinitions.ensureSeeded();

        const page = this.normalizePage(query.page, 1);
        const pageSize = this.normalizePageSize(query.pageSize, 20);
        const search = String(query.search || "").trim().toLowerCase();
        const category = this.normalizeOptionalString(query.category);
        const rawStatus = this.normalizeOptionalString(query.status);
        const status = rawStatus === "ACTIVE" ? "PUBLISHED" : rawStatus;

        const definitions = await this.templateDefinitions.listAll();
        const categories = definitions.map((definition) => definition.category);
        const legacyTemplates = await this.prisma.emailTemplate.findMany({
            where: {
                category: {
                    in: categories as any,
                },
                status: "ACTIVE" as any,
            },
            orderBy: [{ updatedAt: "desc" }, { version: "desc" }],
        });

        const legacyMap = new Map<string, any>();
        for (const item of legacyTemplates) {
            if (!legacyMap.has(item.category)) {
                legacyMap.set(item.category, item);
            }
        }

        const filtered = definitions
            .map((definition) =>
                this.mapTemplateSummary(
                    definition,
                    legacyMap.get(definition.category) ?? null,
                ),
            )
            .filter((item) => {
                if (category && item.category !== category) {
                    return false;
                }

                if (search) {
                    const haystack = [
                        item.key,
                        item.category,
                        item.name,
                        item.description ?? "",
                    ]
                        .join(" ")
                        .toLowerCase();

                    if (!haystack.includes(search)) {
                        return false;
                    }
                }

                if (status === "DRAFT" && !item.draftVersion) {
                    return false;
                }

                if (status === "PUBLISHED" && !item.publishedVersion) {
                    return false;
                }

                if (status === "ARCHIVED") {
                    return false;
                }

                return true;
            });

        const total = filtered.length;
        const items = filtered.slice((page - 1) * pageSize, page * pageSize);

        return {
            items,
            total,
            page,
            pageSize,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
        };
    }

    async getTemplateDetail(adminUserId: string, key: string) {
        await this.requirePermission(adminUserId, ADMIN_PERMISSIONS.EMAIL_TEMPLATES_VIEW);
        await this.templateDefinitions.ensureSeeded();

        const definition = await this.templateDefinitions.getByKey(key);
        if (!definition) {
            throw new NotFoundException("Email template definition not found.");
        }

        const legacyTemplate = await this.getLegacyActiveTemplate(definition.category);

        return this.mapTemplateDetail(definition, legacyTemplate);
    }

    async createTemplateDraft(
        adminUserId: string,
        key: string,
        dto: CreateEmailTemplateDraftDto,
    ) {
        const adminUser = await this.requireAnyPermission(adminUserId, [
            ADMIN_PERMISSIONS.EMAIL_TEMPLATES_MANAGE,
            ADMIN_PERMISSIONS.EMAIL_TEMPLATES_CREATE,
            ADMIN_PERMISSIONS.EMAIL_TEMPLATES_EDIT,
        ]);

        const definition = await this.templateDefinitions.getByKey(key);
        if (!definition) {
            throw new NotFoundException("Email template definition not found.");
        }

        const existingDraft = definition.versions.find(
            (version) => version.status === ("DRAFT" as any) && !version.archivedAt,
        );

        if (existingDraft) {
            return {
                success: true,
                reused: true,
                draftId: existingDraft.id,
            };
        }

        const catalogEntry = getEmailTemplateCatalogEntry(definition.key);
        if (!catalogEntry) {
            throw new BadRequestException("Template catalog entry not found.");
        }

        let nextDefinition = definition;
        let subject = catalogEntry.defaultSubject;
        let markupSource = buildDefaultTemplateSource(
            catalogEntry,
            definition.editorType as "MJML" | "HTML",
        );
        let textBodySource = "";
        const sourcePreference = dto.source ?? "AUTO";

        let sourceVersion = null as any;
        if (dto.sourceVersionId) {
            sourceVersion = definition.versions.find(
                (version) => version.id === dto.sourceVersionId,
            );
            if (!sourceVersion) {
                throw new NotFoundException("Source template version not found.");
            }
        }

        const publishedVersion =
            definition.publishedVersion ??
            definition.versions.find((version) => version.status === ("PUBLISHED" as any)) ??
            null;

        const legacyActive = await this.getLegacyActiveTemplate(definition.category);

        const shouldUsePublished =
            !sourceVersion &&
            (sourcePreference === "PUBLISHED_VERSION" ||
                (sourcePreference === "AUTO" && publishedVersion));

        const shouldUseLegacy =
            !sourceVersion &&
            !shouldUsePublished &&
            (sourcePreference === "LEGACY_ACTIVE" ||
                (sourcePreference === "AUTO" && legacyActive));

        if (sourceVersion) {
            subject = sourceVersion.subject;
            markupSource = sourceVersion.markupSource;
            textBodySource = sourceVersion.textBodySource ?? "";
        } else if (shouldUsePublished && publishedVersion) {
            subject = publishedVersion.subject;
            markupSource = publishedVersion.markupSource;
            textBodySource = publishedVersion.textBodySource ?? "";
        } else if (shouldUseLegacy && legacyActive) {
            if (definition.editorType !== "HTML") {
                nextDefinition = await this.prisma.emailTemplateDefinition.update({
                    where: { id: definition.id },
                    data: {
                        editorType: "HTML" as any,
                        updatedByAdminUserId: adminUser.id,
                    },
                    include: {
                        publishedVersion: true,
                        versions: {
                            orderBy: [{ version: "desc" }, { createdAt: "desc" }],
                        },
                    },
                });
            }

            subject = legacyActive.subject;
            markupSource = legacyActive.htmlBody;
            textBodySource = legacyActive.textBody;
        }

        const sampleVariables =
            Object.keys(this.jsonObject(nextDefinition.sampleVariables)).length > 0
                ? this.jsonObject(nextDefinition.sampleVariables)
                : buildDefaultSampleVariables(catalogEntry);

        const compile = this.renderer.compileTemplateVersion({
            editorType: nextDefinition.editorType as "MJML" | "HTML",
            subject,
            markupSource,
            textBodySource,
            allowedVariables: Array.isArray(nextDefinition.allowedVariables)
                ? nextDefinition.allowedVariables.map((item: any) => String(item?.name || "").trim()).filter(Boolean)
                : [],
            requiredVariables: this.jsonStringArray(nextDefinition.requiredVariables),
            sampleVariables,
            strictRequired: false,
        });

        const nextVersionNumber =
            Math.max(0, ...nextDefinition.versions.map((version) => version.version)) + 1;

        const created = await this.prisma.emailTemplateVersion.create({
            data: {
                definitionId: nextDefinition.id,
                version: nextVersionNumber,
                status: "DRAFT" as any,
                subject,
                markupSource,
                textBodySource: textBodySource || null,
                htmlBodyCompiled: compile.compiledHtml,
                textBodyCompiled: compile.compiledText,
                validationErrorsJson: compile.errors as Prisma.InputJsonValue,
                placeholders: compile.detectedVariables as Prisma.InputJsonValue,
                compiledAt: new Date(),
                createdByAdminUserId: adminUser.id,
                updatedByAdminUserId: adminUser.id,
            },
        });

        await this.prisma.emailTemplateDefinition.update({
            where: { id: nextDefinition.id },
            data: {
                updatedByAdminUserId: adminUser.id,
                sampleVariables:
                    Object.keys(this.jsonObject(nextDefinition.sampleVariables)).length > 0
                        ? undefined
                        : (sampleVariables as Prisma.InputJsonValue),
            },
        });

        return {
            success: true,
            reused: false,
            draftId: created.id,
        };
    }

    async updateTemplateVersion(
        adminUserId: string,
        id: string,
        dto: UpdateEmailTemplateVersionDto,
    ) {
        const adminUser = await this.requireAnyPermission(adminUserId, [
            ADMIN_PERMISSIONS.EMAIL_TEMPLATES_MANAGE,
            ADMIN_PERMISSIONS.EMAIL_TEMPLATES_EDIT,
        ]);

        const version = await this.prisma.emailTemplateVersion.findUnique({
            where: { id },
            include: {
                definition: true,
            },
        });

        if (!version) {
            throw new NotFoundException("Email template version not found.");
        }

        if (version.status !== ("DRAFT" as any)) {
            throw new BadRequestException("Only draft versions can be edited.");
        }

        const nextSubject = dto.subject ?? version.subject;
        const nextMarkupSource = dto.markupSource ?? version.markupSource;
        const nextTextBodySource =
            dto.textBodySource !== undefined
                ? dto.textBodySource
                : version.textBodySource ?? "";

        const nextSampleVariables =
            dto.sampleVariables !== undefined
                ? dto.sampleVariables
                : this.jsonObject(version.definition.sampleVariables);

        const compile = this.renderer.compileTemplateVersion({
            editorType: version.definition.editorType as "MJML" | "HTML",
            subject: nextSubject,
            markupSource: nextMarkupSource,
            textBodySource: nextTextBodySource,
            allowedVariables: Array.isArray(version.definition.allowedVariables)
                ? version.definition.allowedVariables
                    .map((item: any) => String(item?.name || "").trim())
                    .filter(Boolean)
                : [],
            requiredVariables: this.jsonStringArray(version.definition.requiredVariables),
            sampleVariables: nextSampleVariables,
            strictRequired: false,
        });

        await this.prisma.$transaction([
            this.prisma.emailTemplateVersion.update({
                where: { id: version.id },
                data: {
                    subject: nextSubject,
                    markupSource: nextMarkupSource,
                    textBodySource: nextTextBodySource || null,
                    htmlBodyCompiled: compile.compiledHtml,
                    textBodyCompiled: compile.compiledText,
                    validationErrorsJson: compile.errors as Prisma.InputJsonValue,
                    placeholders: compile.detectedVariables as Prisma.InputJsonValue,
                    compiledAt: new Date(),
                    updatedByAdminUserId: adminUser.id,
                },
            }),
            this.prisma.emailTemplateDefinition.update({
                where: { id: version.definitionId },
                data: {
                    sampleVariables:
                        dto.sampleVariables !== undefined
                            ? (dto.sampleVariables as Prisma.InputJsonValue)
                            : undefined,
                    updatedByAdminUserId: adminUser.id,
                },
            }),
        ]);

        const detail = await this.getTemplateDetail(adminUserId, version.definition.key);

        return {
            success: true,
            detail,
            validation: compile,
        };
    }

    async validateTemplateVersion(
        adminUserId: string,
        id: string,
        dto: RenderEmailTemplateVersionDto,
    ) {
        await this.requireAnyPermission(adminUserId, [
            ADMIN_PERMISSIONS.EMAIL_TEMPLATES_VIEW,
            ADMIN_PERMISSIONS.EMAIL_TEMPLATES_PREVIEW,
            ADMIN_PERMISSIONS.EMAIL_TEMPLATES_MANAGE,
        ]);

        const version = await this.prisma.emailTemplateVersion.findUnique({
            where: { id },
            include: {
                definition: true,
            },
        });

        if (!version) {
            throw new NotFoundException("Email template version not found.");
        }

        const result = this.renderer.compileTemplateVersion({
            editorType: version.definition.editorType as "MJML" | "HTML",
            subject: version.subject,
            markupSource: version.markupSource,
            textBodySource: version.textBodySource ?? "",
            allowedVariables: Array.isArray(version.definition.allowedVariables)
                ? version.definition.allowedVariables
                    .map((item: any) => String(item?.name || "").trim())
                    .filter(Boolean)
                : [],
            requiredVariables: this.jsonStringArray(version.definition.requiredVariables),
            sampleVariables:
                dto.sampleVariables !== undefined
                    ? dto.sampleVariables
                    : this.jsonObject(version.definition.sampleVariables),
            strictRequired: false,
        });

        return {
            success: true,
            result,
        };
    }

    async previewTemplateVersion(
        adminUserId: string,
        id: string,
        dto: RenderEmailTemplateVersionDto,
    ) {
        return this.validateTemplateVersion(adminUserId, id, dto);
    }

    async publishTemplateVersion(adminUserId: string, id: string) {
        const adminUser = await this.requireAnyPermission(adminUserId, [
            ADMIN_PERMISSIONS.EMAIL_TEMPLATES_MANAGE,
            ADMIN_PERMISSIONS.EMAIL_TEMPLATES_PUBLISH,
        ]);

        const version = await this.prisma.emailTemplateVersion.findUnique({
            where: { id },
            include: {
                definition: true,
            },
        });

        if (!version) {
            throw new NotFoundException("Email template version not found.");
        }

        if (version.status !== ("DRAFT" as any)) {
            throw new BadRequestException("Only draft versions can be published.");
        }

        const validation = this.renderer.compileTemplateVersion({
            editorType: version.definition.editorType as "MJML" | "HTML",
            subject: version.subject,
            markupSource: version.markupSource,
            textBodySource: version.textBodySource ?? "",
            allowedVariables: Array.isArray(version.definition.allowedVariables)
                ? version.definition.allowedVariables
                    .map((item: any) => String(item?.name || "").trim())
                    .filter(Boolean)
                : [],
            requiredVariables: this.jsonStringArray(version.definition.requiredVariables),
            sampleVariables: this.jsonObject(version.definition.sampleVariables),
            strictRequired: true,
        });

        if (!validation.valid) {
            throw new BadRequestException({
                message: "Template validation failed. Fix the template before publishing.",
                validation,
            });
        }

        await this.prisma.$transaction([
            this.prisma.emailTemplateVersion.updateMany({
                where: {
                    definitionId: version.definitionId,
                    status: "PUBLISHED" as any,
                },
                data: {
                    status: "ARCHIVED" as any,
                    archivedAt: new Date(),
                    updatedByAdminUserId: adminUser.id,
                },
            }),
            this.prisma.emailTemplateVersion.update({
                where: { id: version.id },
                data: {
                    status: "PUBLISHED" as any,
                    archivedAt: null,
                    htmlBodyCompiled: validation.compiledHtml,
                    textBodyCompiled: validation.compiledText,
                    validationErrorsJson: validation.errors as Prisma.InputJsonValue,
                    placeholders: validation.detectedVariables as Prisma.InputJsonValue,
                    compiledAt: new Date(),
                    updatedByAdminUserId: adminUser.id,
                },
            }),
            this.prisma.emailTemplateDefinition.update({
                where: { id: version.definitionId },
                data: {
                    publishedVersionId: version.id,
                    updatedByAdminUserId: adminUser.id,
                },
            }),
        ]);

        return {
            success: true,
            versionId: version.id,
            definitionKey: version.definition.key,
        };
    }

    async archiveTemplateVersion(
        adminUserId: string,
        id: string,
        _dto: ArchiveEmailTemplateVersionDto,
    ) {
        const adminUser = await this.requireAnyPermission(adminUserId, [
            ADMIN_PERMISSIONS.EMAIL_TEMPLATES_MANAGE,
            ADMIN_PERMISSIONS.EMAIL_TEMPLATES_ARCHIVE,
        ]);

        const version = await this.prisma.emailTemplateVersion.findUnique({
            where: { id },
            include: {
                definition: true,
            },
        });

        if (!version) {
            throw new NotFoundException("Email template version not found.");
        }

        if (version.status === ("PUBLISHED" as any)) {
            throw new BadRequestException(
                "Published versions cannot be archived directly. Publish a replacement first.",
            );
        }

        await this.prisma.$transaction([
            this.prisma.emailTemplateVersion.update({
                where: { id: version.id },
                data: {
                    status: "ARCHIVED" as any,
                    archivedAt: new Date(),
                    updatedByAdminUserId: adminUser.id,
                },
            }),
            this.prisma.emailTemplateDefinition.update({
                where: { id: version.definitionId },
                data: {
                    updatedByAdminUserId: adminUser.id,
                },
            }),
        ]);

        return {
            success: true,
            versionId: version.id,
        };
    }

    async sendTemplateVersionTest(
        adminUserId: string,
        id: string,
        dto: SendEmailTemplateVersionTestDto,
    ) {
        const adminUser = await this.requireAnyPermission(adminUserId, [
            ADMIN_PERMISSIONS.EMAIL_TEMPLATES_MANAGE,
            ADMIN_PERMISSIONS.EMAIL_TEMPLATES_SEND_TEST,
            ADMIN_PERMISSIONS.EMAIL_SEND_MANUAL,
        ]);

        const version = await this.prisma.emailTemplateVersion.findUnique({
            where: { id },
            include: {
                definition: true,
            },
        });

        if (!version) {
            throw new NotFoundException("Email template version not found.");
        }

        const result = this.renderer.compileTemplateVersion({
            editorType: version.definition.editorType as "MJML" | "HTML",
            subject: version.subject,
            markupSource: version.markupSource,
            textBodySource: version.textBodySource ?? "",
            allowedVariables: Array.isArray(version.definition.allowedVariables)
                ? version.definition.allowedVariables
                    .map((item: any) => String(item?.name || "").trim())
                    .filter(Boolean)
                : [],
            requiredVariables: this.jsonStringArray(version.definition.requiredVariables),
            sampleVariables:
                dto.sampleVariables !== undefined
                    ? dto.sampleVariables
                    : this.jsonObject(version.definition.sampleVariables),
            strictRequired: true,
        });

        if (!result.valid) {
            throw new BadRequestException({
                message: "Template validation failed. Fix the template before sending a test email.",
                validation: result,
            });
        }

        const account = await this.resolveSmtpAccountForCategory(
            version.definition.category,
        );

        if (!account) {
            throw new BadRequestException(
                `No SMTP account resolved for category ${version.definition.category}.`,
            );
        }

        if (account.status === "DISABLED" || account.status === "ARCHIVED") {
            throw new BadRequestException(
                `Resolved SMTP account ${account.id} is not sendable because it is ${account.status}.`,
            );
        }

        const recipientEmail = String(dto.recipientEmail || "").trim().toLowerCase();
        if (!recipientEmail) {
            throw new BadRequestException("Recipient email is required.");
        }

        const log = await this.prisma.emailDeliveryLog.create({
            data: {
                category: version.definition.category as any,
                smtpAccountId: account.id,
                templateKey: version.definition.key,
                recipientEmail,
                subjectSnapshot: this.truncate(result.renderedSubject, 500),
                htmlSnapshot: result.renderedHtml,
                textSnapshot: result.renderedText,
                status: "SENDING" as any,
                initiatedByAdminUserId: adminUser.id,
                correlationJson: {
                    type: "template_test_send",
                    templateVersionId: version.id,
                    definitionKey: version.definition.key,
                } as Prisma.InputJsonValue,
                lastAttemptAt: new Date(),
            },
        });

        const testLog = await this.prisma.emailTemplateTestLog.create({
            data: {
                templateVersionId: version.id,
                recipientEmail,
                sampleVariablesJson:
                    dto.sampleVariables !== undefined
                        ? (dto.sampleVariables as Prisma.InputJsonValue)
                        : (this.jsonObject(version.definition.sampleVariables) as Prisma.InputJsonValue),
                deliveryLogId: log.id,
                initiatedByAdminUserId: adminUser.id,
            },
        });

        try {
            const info = await this.transport.sendEmail(
                account as any,
                recipientEmail,
                result.renderedSubject,
                result.renderedText,
                result.renderedHtml,
            );

            await Promise.all([
                this.prisma.emailDeliveryLog.update({
                    where: { id: log.id },
                    data: {
                        status: "SENT" as any,
                        providerMessageId: info.messageId ?? null,
                        providerResponse:
                            typeof info.response === "string"
                                ? info.response
                                : JSON.stringify(info),
                        sentAt: new Date(),
                        lastAttemptAt: new Date(),
                    },
                }),
                this.prisma.smtpAccount.update({
                    where: { id: account.id },
                    data: {
                        lastHealthcheckAt: new Date(),
                        lastError: null,
                        status:
                            account.status === "FAILING" ? ("ACTIVE" as any) : undefined,
                    },
                }),
            ]);

            return {
                success: true,
                testLogId: testLog.id,
                deliveryLogId: log.id,
                recipientEmail,
                messageId: info.messageId ?? null,
            };
        } catch (error) {
            const message =
                error instanceof Error ? error.message.slice(0, 4000) : "Template test send failed.";

            await Promise.all([
                this.prisma.emailDeliveryLog.update({
                    where: { id: log.id },
                    data: {
                        status: "FAILED" as any,
                        errorMessage: message,
                        lastAttemptAt: new Date(),
                    },
                }),
                this.prisma.smtpAccount.update({
                    where: { id: account.id },
                    data: {
                        lastHealthcheckAt: new Date(),
                        lastError: message,
                        status:
                            account.status === "ACTIVE" ? ("FAILING" as any) : account.status,
                    },
                }),
            ]);

            throw new BadRequestException({
                message: "Template test send failed.",
                error: message,
                deliveryLogId: log.id,
                testLogId: testLog.id,
            });
        }
    }

    async updateTemplateDefinitionEditor(
        adminUserId: string,
        key: string,
        dto: UpdateEmailTemplateDefinitionEditorDto,
    ) {
        const adminUser = await this.requireAnyPermission(adminUserId, [
            ADMIN_PERMISSIONS.EMAIL_TEMPLATES_MANAGE,
            ADMIN_PERMISSIONS.EMAIL_TEMPLATES_EDIT,
        ]);

        const definition = await this.prisma.emailTemplateDefinition.findUnique({
            where: { key },
            include: {
                versions: {
                    where: {
                        status: "PUBLISHED" as any,
                    },
                },
            },
        });

        if (!definition) {
            throw new NotFoundException("Email template definition not found.");
        }

        if (definition.versions.length > 0) {
            throw new BadRequestException(
                "You cannot switch editor type after a version has already been published for this category.",
            );
        }

        const updated = await this.prisma.emailTemplateDefinition.update({
            where: { key },
            data: {
                editorType: dto.editorType as any,
                updatedByAdminUserId: adminUser.id,
            },
        });

        return {
            success: true,
            key: updated.key,
            editorType: updated.editorType,
        };
    }

    async listDeliveryLogs(
        adminUserId: string,
        query: AdminEmailDeliveryLogsQueryDto = {},
    ) {
        await this.requirePermission(adminUserId, ADMIN_PERMISSIONS.EMAIL_LOGS_VIEW);

        const page = this.normalizePage(query.page, 1);
        const pageSize = this.normalizePageSize(query.pageSize, 20);
        const search = String(query.search || "").trim();
        const status = this.normalizeOptionalString(query.status);
        const category = this.normalizeOptionalString(query.category);
        const smtpAccountId = this.normalizeOptionalString(query.smtpAccountId);

        const where: Prisma.EmailDeliveryLogWhereInput = {};

        if (status) {
            where.status = status as any;
        }

        if (category) {
            where.category = category as any;
        }

        if (smtpAccountId) {
            where.smtpAccountId = smtpAccountId;
        }

        if (search) {
            const orFilters: Prisma.EmailDeliveryLogWhereInput[] = [
                { recipientEmail: { contains: search, mode: "insensitive" } },
                { templateKey: { contains: search, mode: "insensitive" } },
                { providerMessageId: { contains: search, mode: "insensitive" } },
                { errorMessage: { contains: search, mode: "insensitive" } },
            ];

            if (/^[0-9a-f-]{36}$/i.test(search)) {
                orFilters.unshift(
                    { id: { equals: search } },
                    { recipientUserId: { equals: search } },
                    { initiatedByAdminUserId: { equals: search } },
                );
            }

            where.OR = orFilters;
        }

        const [total, items] = await Promise.all([
            this.prisma.emailDeliveryLog.count({ where }),
            this.prisma.emailDeliveryLog.findMany({
                where,
                include: {
                    smtpAccount: {
                        select: {
                            id: true,
                            label: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
        ]);

        return {
            items: items.map((item) => ({
                id: item.id,
                category: item.category,
                status: item.status,
                smtpAccountId: item.smtpAccountId ?? null,
                smtpAccountLabel: item.smtpAccount?.label ?? null,
                recipientEmail: item.recipientEmail,
                recipientUserId: item.recipientUserId ?? null,
                templateKey: item.templateKey ?? null,
                retryCount: item.retryCount,
                providerMessageId: item.providerMessageId ?? null,
                errorMessage: item.errorMessage ?? null,
                subjectSnapshot: item.subjectSnapshot ?? null,
                createdAt: item.createdAt.toISOString(),
                lastAttemptAt: item.lastAttemptAt
                    ? item.lastAttemptAt.toISOString()
                    : null,
                sentAt: item.sentAt ? item.sentAt.toISOString() : null,
            })),
            total,
            page,
            pageSize,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
        };
    }
}