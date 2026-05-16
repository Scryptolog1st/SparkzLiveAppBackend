import {
    IsIn,
    IsObject,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
} from "class-validator";

export const ADMIN_PAYOUT_STATUSES = [
    "PENDING",
    "PROCESSING",
    "PAID",
    "REJECTED",
    "CANCELLED",
    "FAILED",
    "RETURNED",
    "UNCLAIMED",
] as const;

export const PAYOUT_PROVIDERS = [
    "MANUAL",
    "STRIPE",
    "PAYPAL",
] as const;

export class AdminPayoutRequestsQueryDto {
    @IsOptional()
    @IsIn(ADMIN_PAYOUT_STATUSES)
    status?: string;

    @IsOptional()
    @IsString()
    @MaxLength(120)
    search?: string;

    @IsOptional()
    @IsIn(["newest", "oldest", "amount_desc", "amount_asc"])
    sort?: string;

    @IsOptional()
    @IsString()
    page?: string;

    @IsOptional()
    @IsString()
    pageSize?: string;
}

export class AdminPayoutSummaryQueryDto {
    @IsOptional()
    @IsIn(ADMIN_PAYOUT_STATUSES)
    status?: string;
}

export class MarkPayoutProcessingDto {
    @IsOptional()
    @IsString()
    @MaxLength(500)
    adminNotes?: string;

    @IsOptional()
    @IsIn(PAYOUT_PROVIDERS)
    provider?: string;

    @IsOptional()
    @IsUUID()
    payoutMethodId?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    providerBatchId?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    providerPayoutId?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    providerStatus?: string;

    @IsOptional()
    @IsObject()
    providerResponse?: Record<string, unknown>;
}

export class ApprovePayoutRequestDto {
    @IsOptional()
    @IsString()
    @MaxLength(120)
    paymentMethod?: string;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    paymentReference?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    adminNotes?: string;

    @IsOptional()
    @IsIn(PAYOUT_PROVIDERS)
    provider?: string;

    @IsOptional()
    @IsUUID()
    payoutMethodId?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    providerBatchId?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    providerPayoutId?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    providerStatus?: string;

    @IsOptional()
    @IsObject()
    providerResponse?: Record<string, unknown>;
}

export class RejectPayoutRequestDto {
    @IsOptional()
    @IsString()
    @MaxLength(500)
    adminNotes?: string;
}

export class MarkPayoutFailedDto {
    @IsOptional()
    @IsIn(["FAILED", "RETURNED", "UNCLAIMED", "CANCELLED", "REJECTED"])
    status?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    adminNotes?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    providerStatus?: string;

    @IsOptional()
    @IsObject()
    providerResponse?: Record<string, unknown>;
}

export class UpdatePayoutRequestNotesDto {
    @IsOptional()
    @IsString()
    @MaxLength(500)
    adminNotes?: string;
}