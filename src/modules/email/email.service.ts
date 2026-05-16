import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EmailCategory, Prisma } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { EmailTemplateDefinitionService } from "./email-template-definition.service";
import { EmailTemplateRendererService } from "./email-template-renderer.service";
import { EmailTransportService } from "./email-transport.service";

type EmailVariables = Record<
    string,
    string | number | boolean | Date | null | undefined
>;

type ResolvedSmtpAccount = {
    id: string;
    host: string;
    port: number;
    secure: boolean;
    username: string;
    encryptedPassword: string;
    fromName: string;
    fromEmail: string;
    replyToEmail: string | null;
    status: string;
};

export type SendCategorizedEmailInput = {
    category: EmailCategory;
    recipientEmail: string;
    recipientUserId?: string | null;
    variables?: EmailVariables;
    initiatedByAdminUserId?: string | null;
    correlation?: Prisma.InputJsonValue;
};

export type SendCategorizedEmailResult = {
    success: boolean;
    logId: string;
    status: "SENT" | "FAILED";
    error?: string | null;
    messageId?: string | null;
};

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
        private readonly transport: EmailTransportService,
        private readonly templateDefinitions: EmailTemplateDefinitionService,
        private readonly renderer: EmailTemplateRendererService,
    ) { }

    private normalizeOptionalString(value?: string | null) {
        const normalized = String(value || "").trim();
        return normalized ? normalized : null;
    }

    private sanitizeHeaderValue(value?: string | null) {
        return String(value || "")
            .replace(/[\r\n]+/g, " ")
            .trim();
    }

    private truncate(value: string | null | undefined, max: number) {
        const normalized = String(value || "");
        return normalized.length <= max
            ? normalized
            : normalized.slice(0, max);
    }

    private getFallbackSmtpAccountId() {
        const raw = this.config.get<string>(
            "EMAIL_EMERGENCY_FALLBACK_SMTP_ACCOUNT_ID",
        );

        const normalized = String(raw || "").trim();
        return normalized || null;
    }

    private normalizeVariableValue(
        value: EmailVariables[string],
    ) {
        if (value instanceof Date) {
            return value.toISOString();
        }

        if (value === null || value === undefined) {
            return "";
        }

        return String(value);
    }

    private escapeHtml(value: string) {
        return value
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    private renderText(source: string, variables: EmailVariables) {
        return String(source || "").replace(
            /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}|\{\s*([a-zA-Z0-9_]+)\s*\}/g,
            (_full, key1, key2) =>
                this.normalizeVariableValue(variables[String(key1 || key2)]),
        );
    }

    private renderHtml(source: string, variables: EmailVariables) {
        return String(source || "").replace(
            /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}|\{\s*([a-zA-Z0-9_]+)\s*\}/g,
            (_full, key1, key2) =>
                this.escapeHtml(
                    this.normalizeVariableValue(
                        variables[String(key1 || key2)],
                    ),
                ).replace(/\r?\n/g, "<br />"),
        );
    }

    private getRequiredVariables(
        value: Prisma.JsonValue | null | undefined,
    ): string[] {
        if (Array.isArray(value)) {
            return value
                .map((item) => String(item || "").trim())
                .filter(Boolean);
        }

        if (value && typeof value === "object") {
            return Object.keys(value as Record<string, unknown>)
                .map((item) => String(item || "").trim())
                .filter(Boolean);
        }

        return [];
    }

    private async getActiveLegacyTemplate(category: EmailCategory) {
        return this.prisma.emailTemplate.findFirst({
            where: {
                category,
                status: "ACTIVE" as any,
            },
            orderBy: [{ updatedAt: "desc" }, { version: "desc" }, { createdAt: "desc" }],
        });
    }

    private async resolveSmtpAccount(
        category: EmailCategory,
    ): Promise<ResolvedSmtpAccount | null> {
        const mapping = await this.prisma.emailCategoryMapping.findUnique({
            where: { category },
            include: {
                smtpAccount: {
                    select: {
                        id: true,
                        host: true,
                        port: true,
                        secure: true,
                        username: true,
                        encryptedPassword: true,
                        fromName: true,
                        fromEmail: true,
                        replyToEmail: true,
                        status: true,
                    },
                },
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
            select: {
                id: true,
                host: true,
                port: true,
                secure: true,
                username: true,
                encryptedPassword: true,
                fromName: true,
                fromEmail: true,
                replyToEmail: true,
                status: true,
            },
        });
    }

    private async markSmtpHealthy(accountId: string, currentStatus: string) {
        await this.prisma.smtpAccount.update({
            where: { id: accountId },
            data: {
                lastHealthcheckAt: new Date(),
                lastError: null,
                status: currentStatus === "FAILING" ? ("ACTIVE" as any) : undefined,
            },
        });
    }

    private async markSmtpFailed(
        accountId: string,
        currentStatus: string,
        message: string,
    ) {
        await this.prisma.smtpAccount.update({
            where: { id: accountId },
            data: {
                lastHealthcheckAt: new Date(),
                lastError: this.truncate(message, 2000),
                status:
                    currentStatus === "DISABLED" || currentStatus === "ARCHIVED"
                        ? undefined
                        : ("FAILING" as any),
            },
        });
    }

    private serializeProviderResponse(value: unknown) {
        if (typeof value === "string") {
            return value;
        }

        try {
            return JSON.stringify(value);
        } catch {
            return null;
        }
    }

    private async resolvePreparedTemplate(
        category: EmailCategory,
        variables: EmailVariables,
    ) {
        await this.templateDefinitions.ensureSeeded();

        const definition = await this.templateDefinitions.getByCategory(category);

        if (definition?.publishedVersion) {
            const requiredVariables = this.getRequiredVariables(
                definition.requiredVariables,
            );

            const versioned = this.renderer.renderStoredTemplate({
                subject: definition.publishedVersion.subject,
                htmlBody: definition.publishedVersion.htmlBodyCompiled,
                textBody: definition.publishedVersion.textBodyCompiled,
                requiredVariables,
                variables,
            });

            return {
                templateKey: definition.key,
                requiredVariables,
                missingRequiredVariables: versioned.missingRequiredVariables,
                renderedSubject: versioned.renderedSubject,
                renderedHtml: versioned.renderedHtml,
                renderedText: versioned.renderedText,
            };
        }

        const legacyTemplate = await this.getActiveLegacyTemplate(category);
        if (!legacyTemplate) {
            return null;
        }

        const requiredVariables = this.getRequiredVariables(
            legacyTemplate.requiredVariables,
        );
        const missingRequiredVariables = requiredVariables.filter((key) => {
            const value = variables[key];
            return value === undefined || value === null || !String(value).trim();
        });

        const renderedSubject =
            this.sanitizeHeaderValue(this.renderText(legacyTemplate.subject, variables)) ||
            this.sanitizeHeaderValue(legacyTemplate.subject);

        const renderedText = this.renderText(legacyTemplate.textBody, variables);
        const renderedHtml = this.renderHtml(legacyTemplate.htmlBody, variables);

        return {
            templateKey: legacyTemplate.key,
            requiredVariables,
            missingRequiredVariables,
            renderedSubject,
            renderedHtml,
            renderedText,
        };
    }

    async sendCategorizedEmail(
        input: SendCategorizedEmailInput,
    ): Promise<SendCategorizedEmailResult> {
        const recipientEmail = this.normalizeOptionalString(
            input.recipientEmail,
        )?.toLowerCase();

        if (!recipientEmail) {
            throw new Error("Recipient email is required.");
        }

        const variables = input.variables ?? {};
        const prepared = await this.resolvePreparedTemplate(
            input.category,
            variables,
        );

        if (!prepared) {
            const message = `No email template found for category ${input.category}.`;

            const log = await this.prisma.emailDeliveryLog.create({
                data: {
                    category: input.category,
                    recipientEmail,
                    recipientUserId: input.recipientUserId ?? null,
                    status: "FAILED" as any,
                    errorMessage: this.truncate(message, 4000),
                    initiatedByAdminUserId: input.initiatedByAdminUserId ?? null,
                    correlationJson: input.correlation ?? undefined,
                    lastAttemptAt: new Date(),
                },
            });

            this.logger.warn(message);

            return {
                success: false,
                logId: log.id,
                status: "FAILED",
                error: message,
            };
        }

        if (prepared.missingRequiredVariables.length > 0) {
            const message = `Missing required email template variables: ${prepared.missingRequiredVariables.join(", ")}`;

            const log = await this.prisma.emailDeliveryLog.create({
                data: {
                    category: input.category,
                    templateKey: prepared.templateKey,
                    recipientEmail,
                    recipientUserId: input.recipientUserId ?? null,
                    subjectSnapshot: this.truncate(prepared.renderedSubject, 500),
                    htmlSnapshot: prepared.renderedHtml,
                    textSnapshot: prepared.renderedText,
                    status: "FAILED" as any,
                    errorMessage: this.truncate(message, 4000),
                    initiatedByAdminUserId: input.initiatedByAdminUserId ?? null,
                    correlationJson: input.correlation ?? undefined,
                    lastAttemptAt: new Date(),
                },
            });

            this.logger.warn(
                `Failed to send ${input.category} email because required template variables were missing.`,
            );

            return {
                success: false,
                logId: log.id,
                status: "FAILED",
                error: message,
            };
        }

        const account = await this.resolveSmtpAccount(input.category);

        if (!account) {
            const message = `No SMTP account resolved for category ${input.category}.`;

            const log = await this.prisma.emailDeliveryLog.create({
                data: {
                    category: input.category,
                    templateKey: prepared.templateKey,
                    recipientEmail,
                    recipientUserId: input.recipientUserId ?? null,
                    subjectSnapshot: this.truncate(prepared.renderedSubject, 500),
                    htmlSnapshot: prepared.renderedHtml,
                    textSnapshot: prepared.renderedText,
                    status: "FAILED" as any,
                    errorMessage: this.truncate(message, 4000),
                    initiatedByAdminUserId: input.initiatedByAdminUserId ?? null,
                    correlationJson: input.correlation ?? undefined,
                    lastAttemptAt: new Date(),
                },
            });

            this.logger.warn(message);

            return {
                success: false,
                logId: log.id,
                status: "FAILED",
                error: message,
            };
        }

        if (account.status === "DISABLED" || account.status === "ARCHIVED") {
            const message = `Resolved SMTP account ${account.id} is not sendable because it is ${account.status}.`;

            const log = await this.prisma.emailDeliveryLog.create({
                data: {
                    category: input.category,
                    smtpAccountId: account.id,
                    templateKey: prepared.templateKey,
                    recipientEmail,
                    recipientUserId: input.recipientUserId ?? null,
                    subjectSnapshot: this.truncate(prepared.renderedSubject, 500),
                    htmlSnapshot: prepared.renderedHtml,
                    textSnapshot: prepared.renderedText,
                    status: "FAILED" as any,
                    errorMessage: this.truncate(message, 4000),
                    initiatedByAdminUserId: input.initiatedByAdminUserId ?? null,
                    correlationJson: input.correlation ?? undefined,
                    lastAttemptAt: new Date(),
                },
            });

            this.logger.warn(message);

            return {
                success: false,
                logId: log.id,
                status: "FAILED",
                error: message,
            };
        }

        const log = await this.prisma.emailDeliveryLog.create({
            data: {
                category: input.category,
                smtpAccountId: account.id,
                templateKey: prepared.templateKey,
                recipientEmail,
                recipientUserId: input.recipientUserId ?? null,
                subjectSnapshot: this.truncate(prepared.renderedSubject, 500),
                htmlSnapshot: prepared.renderedHtml,
                textSnapshot: prepared.renderedText,
                status: "SENDING" as any,
                initiatedByAdminUserId: input.initiatedByAdminUserId ?? null,
                correlationJson: input.correlation ?? undefined,
                lastAttemptAt: new Date(),
            },
        });

        try {
            const info = await this.transport.sendEmail(
                account,
                recipientEmail,
                prepared.renderedSubject,
                prepared.renderedText,
                prepared.renderedHtml,
            );

            await Promise.all([
                this.prisma.emailDeliveryLog.update({
                    where: { id: log.id },
                    data: {
                        status: "SENT" as any,
                        providerMessageId: info.messageId ?? null,
                        providerResponse: this.serializeProviderResponse(
                            info.response ?? info,
                        ),
                        sentAt: new Date(),
                        lastAttemptAt: new Date(),
                    },
                }),
                this.markSmtpHealthy(account.id, account.status),
            ]);

            return {
                success: true,
                logId: log.id,
                status: "SENT",
                messageId: info.messageId ?? null,
            };
        } catch (error) {
            const message = this.truncate(
                error instanceof Error ? error.message : "Email send failed.",
                4000,
            );

            await Promise.all([
                this.prisma.emailDeliveryLog.update({
                    where: { id: log.id },
                    data: {
                        status: "FAILED" as any,
                        errorMessage: message,
                        lastAttemptAt: new Date(),
                    },
                }),
                this.markSmtpFailed(account.id, account.status, message),
            ]);

            this.logger.error(
                `Email send failed for category ${input.category} (log ${log.id}): ${message}`,
            );

            return {
                success: false,
                logId: log.id,
                status: "FAILED",
                error: message,
            };
        }
    }
}