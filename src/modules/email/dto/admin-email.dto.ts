import {
    IsBoolean,
    IsEmail,
    IsIn,
    IsInt,
    IsObject,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    MaxLength,
    Min,
} from "class-validator";

import {
    EMAIL_CATEGORY_VALUES,
    EMAIL_DELIVERY_STATUS_VALUES,
    EMAIL_TEMPLATE_EDITOR_TYPE_VALUES,
    EMAIL_TEMPLATE_FILTER_STATUS_VALUES,
    EMAIL_TEMPLATE_VERSION_STATUS_VALUES,
    SMTP_ACCOUNT_STATUS_VALUES,
} from "../email.constants";

export class AdminSmtpAccountsQueryDto {
    @IsOptional()
    @IsString()
    @MaxLength(120)
    search?: string;

    @IsOptional()
    @IsIn(SMTP_ACCOUNT_STATUS_VALUES)
    status?: string;

    @IsOptional()
    @IsString()
    page?: string;

    @IsOptional()
    @IsString()
    pageSize?: string;
}

export class CreateSmtpAccountDto {
    @IsString()
    @MaxLength(120)
    label!: string;

    @IsString()
    @MaxLength(255)
    host!: string;

    @IsInt()
    @Min(1)
    @Max(65535)
    port!: number;

    @IsBoolean()
    secure!: boolean;

    @IsString()
    @MaxLength(255)
    username!: string;

    @IsString()
    @MaxLength(1000)
    password!: string;

    @IsString()
    @MaxLength(120)
    fromName!: string;

    @IsEmail()
    @MaxLength(255)
    fromEmail!: string;

    @IsOptional()
    @IsEmail()
    @MaxLength(255)
    replyToEmail?: string | null;

    @IsOptional()
    @IsIn(SMTP_ACCOUNT_STATUS_VALUES)
    status?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(100000)
    priority?: number;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    notes?: string;
}

export class UpdateSmtpAccountDto {
    @IsOptional()
    @IsString()
    @MaxLength(120)
    label?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    host?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(65535)
    port?: number;

    @IsOptional()
    @IsBoolean()
    secure?: boolean;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    username?: string;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    password?: string;

    @IsOptional()
    @IsString()
    @MaxLength(120)
    fromName?: string;

    @IsOptional()
    @IsEmail()
    @MaxLength(255)
    fromEmail?: string;

    @IsOptional()
    @IsEmail()
    @MaxLength(255)
    replyToEmail?: string | null;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(100000)
    priority?: number;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    notes?: string;
}

export class UpdateSmtpAccountStatusDto {
    @IsIn(SMTP_ACCOUNT_STATUS_VALUES)
    status!: string;
}

export class UpsertEmailCategoryMappingDto {
    @IsOptional()
    @IsUUID()
    smtpAccountId?: string | null;
}

export class AdminEmailTemplatesQueryDto {
    @IsOptional()
    @IsString()
    @MaxLength(120)
    search?: string;

    @IsOptional()
    @IsIn(EMAIL_CATEGORY_VALUES)
    category?: string;

    @IsOptional()
    @IsIn(EMAIL_TEMPLATE_FILTER_STATUS_VALUES)
    status?: string;

    @IsOptional()
    @IsString()
    page?: string;

    @IsOptional()
    @IsString()
    pageSize?: string;
}

export class AdminEmailDeliveryLogsQueryDto {
    @IsOptional()
    @IsString()
    @MaxLength(255)
    search?: string;

    @IsOptional()
    @IsIn(EMAIL_DELIVERY_STATUS_VALUES)
    status?: string;

    @IsOptional()
    @IsIn(EMAIL_CATEGORY_VALUES)
    category?: string;

    @IsOptional()
    @IsUUID()
    smtpAccountId?: string;

    @IsOptional()
    @IsString()
    page?: string;

    @IsOptional()
    @IsString()
    pageSize?: string;
}

export class CreateEmailTemplateDraftDto {
    @IsOptional()
    @IsIn(["AUTO", "BLANK", "PUBLISHED_VERSION", "LEGACY_ACTIVE"])
    source?: "AUTO" | "BLANK" | "PUBLISHED_VERSION" | "LEGACY_ACTIVE";

    @IsOptional()
    @IsUUID()
    sourceVersionId?: string;
}

export class UpdateEmailTemplateVersionDto {
    @IsOptional()
    @IsString()
    @MaxLength(500)
    subject?: string;

    @IsOptional()
    @IsString()
    @MaxLength(200000)
    markupSource?: string;

    @IsOptional()
    @IsString()
    @MaxLength(200000)
    textBodySource?: string | null;

    @IsOptional()
    @IsObject()
    sampleVariables?: Record<string, unknown>;
}

export class RenderEmailTemplateVersionDto {
    @IsOptional()
    @IsObject()
    sampleVariables?: Record<string, unknown>;
}

export class SendEmailTemplateVersionTestDto extends RenderEmailTemplateVersionDto {
    @IsEmail()
    @MaxLength(255)
    recipientEmail!: string;
}

export class UpdateEmailTemplateDefinitionEditorDto {
    @IsIn(EMAIL_TEMPLATE_EDITOR_TYPE_VALUES)
    editorType!: "MJML" | "HTML";
}

export class ArchiveEmailTemplateVersionDto {
    @IsOptional()
    @IsIn(EMAIL_TEMPLATE_VERSION_STATUS_VALUES)
    requestedStatus?: string;
}