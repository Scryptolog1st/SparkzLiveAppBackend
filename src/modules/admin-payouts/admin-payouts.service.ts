import {
    BadRequestException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from "@nestjs/common";
import {
    EmailCategory,
    LedgerEntryType,
    PayoutProvider,
    PayoutStatus,
    Prisma,
    StreamerEarningStatus,
} from "@prisma/client";

import { AdminAuditService } from "../admin-audit/admin-audit.service";
import { EmailService } from "../email/email.service";
import { PrismaService } from "../prisma/prisma.service";
import {
    AdminPayoutRequestsQueryDto,
    AdminPayoutSummaryQueryDto,
    ApprovePayoutRequestDto,
    MarkPayoutFailedDto,
    MarkPayoutProcessingDto,
    RejectPayoutRequestDto,
    UpdatePayoutRequestNotesDto,
} from "./dto/admin-payouts.dto";

type AdminAuditRequestContext = {
    requestPath?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    deviceLabel?: string | null;
};

type PayoutIncludeRow = Prisma.PayoutRequestGetPayload<{
    include: {
        user: {
            include: {
                profile: true;
            };
        };
        payoutMethod: true;
        earnings: {
            include: {
                giftTx: true;
                giftCoinSource: {
                    include: {
                        coinLot: true;
                    };
                };
            };
        };
    };
}>;

@Injectable()
export class AdminPayoutsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly email: EmailService,
        private readonly adminAudit: AdminAuditService,
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

    private normalizeProvider(value?: string | null): PayoutProvider | undefined {
        const normalized = this.normalizeOptionalString(value)?.toUpperCase();

        if (!normalized) {
            return undefined;
        }

        if (normalized === PayoutProvider.STRIPE) {
            return PayoutProvider.STRIPE;
        }

        if (normalized === PayoutProvider.PAYPAL) {
            return PayoutProvider.PAYPAL;
        }

        if (normalized === PayoutProvider.MANUAL) {
            return PayoutProvider.MANUAL;
        }

        throw new BadRequestException(`Unsupported payout provider: ${value}`);
    }

    private normalizeFailureStatus(value?: string | null): PayoutStatus {
        const normalized = this.normalizeOptionalString(value)?.toUpperCase();

        switch (normalized) {
            case PayoutStatus.RETURNED:
                return PayoutStatus.RETURNED;
            case PayoutStatus.UNCLAIMED:
                return PayoutStatus.UNCLAIMED;
            case PayoutStatus.CANCELLED:
                return PayoutStatus.CANCELLED;
            case PayoutStatus.REJECTED:
                return PayoutStatus.REJECTED;
            case PayoutStatus.FAILED:
            default:
                return PayoutStatus.FAILED;
        }
    }

    private normalizeAuditContext(context?: AdminAuditRequestContext | null) {
        return {
            requestPath: this.normalizeOptionalString(context?.requestPath),
            ipAddress: this.normalizeOptionalString(context?.ipAddress),
            userAgent: this.normalizeOptionalString(context?.userAgent),
            deviceLabel: this.normalizeOptionalString(context?.deviceLabel),
        };
    }

    private formatCurrencyFromCents(value: number | null | undefined) {
        const cents = Number(value ?? 0);

        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(cents / 100);
    }

    private async requireAdmin(adminUserId: string) {
        const admin = await this.prisma.adminUser.findUnique({
            where: { id: adminUserId },
        });

        if (!admin || !admin.isActive) {
            throw new UnauthorizedException("Admin account is not active.");
        }

        return admin;
    }

    private payoutInclude() {
        return {
            user: {
                include: {
                    profile: true,
                },
            },
            payoutMethod: true,
            earnings: {
                orderBy: [
                    { availableAt: "asc" as const },
                    { createdAt: "asc" as const },
                ],
                include: {
                    giftTx: true,
                    giftCoinSource: {
                        include: {
                            coinLot: true,
                        },
                    },
                },
            },
        };
    }

    private mapPayoutRequest(row: PayoutIncludeRow | any) {
        const user = row.user;

        return {
            id: row.id,
            userId: row.userId,
            diamondAmount: row.diamondAmount,
            grossAmount: row.grossAmount ?? 0,
            feeAmount: row.feeAmount ?? 0,
            netAmount: row.netAmount,
            status: row.status,

            provider: row.provider ?? PayoutProvider.MANUAL,
            payoutMethodId: row.payoutMethodId ?? null,
            paymentMethod: row.paymentMethod ?? null,
            paymentDetails: row.paymentDetails ?? null,

            providerBatchId: row.providerBatchId ?? null,
            providerPayoutId: row.providerPayoutId ?? null,
            providerStatus: row.providerStatus ?? null,
            providerResponse: row.providerResponse ?? null,

            adminNotes: row.adminNotes ?? null,

            createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
            updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
            processedAt: row.processedAt instanceof Date ? row.processedAt.toISOString() : null,
            paidAt: row.paidAt instanceof Date ? row.paidAt.toISOString() : null,
            failedAt: row.failedAt instanceof Date ? row.failedAt.toISOString() : null,

            user: user
                ? {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    publicId: user.publicId,
                    displayName: user.profile?.displayName?.trim() || user.username,
                    avatarUrl: user.profile?.avatarUrl ?? null,
                }
                : null,

            payoutMethod: row.payoutMethod
                ? {
                    id: row.payoutMethod.id,
                    type: row.payoutMethod.type,
                    status: row.payoutMethod.status,
                    label: row.payoutMethod.label,
                    isDefault: row.payoutMethod.isDefault,
                    paypalEmail: row.payoutMethod.paypalEmail,
                    stripeConnectedAccountId: row.payoutMethod.stripeConnectedAccountId,
                    stripeExternalAccountId: row.payoutMethod.stripeExternalAccountId,
                }
                : null,

            earnings: Array.isArray(row.earnings)
                ? row.earnings.map((earning: any) => ({
                    id: earning.id,
                    streamerUserId: earning.streamerUserId,
                    giftTxId: earning.giftTxId,
                    giftCoinSourceId: earning.giftCoinSourceId,

                    diamondsEarned: earning.diamondsEarned,
                    coinsSourceUsed: earning.coinsSourceUsed,
                    grossAmountCents: earning.grossAmountCents,
                    platformFeeCents: earning.platformFeeCents,
                    streamerAmountCents: earning.streamerAmountCents,

                    providerAvailableOn: earning.providerAvailableOn instanceof Date
                        ? earning.providerAvailableOn.toISOString()
                        : null,
                    holdUntil: earning.holdUntil instanceof Date
                        ? earning.holdUntil.toISOString()
                        : earning.holdUntil,
                    availableAt: earning.availableAt instanceof Date
                        ? earning.availableAt.toISOString()
                        : earning.availableAt,

                    status: earning.status,
                    reversalReason: earning.reversalReason ?? null,
                    reversedAt: earning.reversedAt instanceof Date
                        ? earning.reversedAt.toISOString()
                        : null,

                    gift: earning.giftTx
                        ? {
                            id: earning.giftTx.id,
                            streamId: earning.giftTx.streamId,
                            giftId: earning.giftTx.giftId,
                            senderUserId: earning.giftTx.senderUserId,
                            recipientUserId: earning.giftTx.recipientUserId,
                            coinCost: earning.giftTx.coinCost,
                            diamondValue: earning.giftTx.diamondValue,
                            createdAt: earning.giftTx.createdAt instanceof Date
                                ? earning.giftTx.createdAt.toISOString()
                                : earning.giftTx.createdAt,
                        }
                        : null,

                    coinSource: earning.giftCoinSource
                        ? {
                            id: earning.giftCoinSource.id,
                            coinLotId: earning.giftCoinSource.coinLotId,
                            coinsUsed: earning.giftCoinSource.coinsUsed,
                            createdAt: earning.giftCoinSource.createdAt instanceof Date
                                ? earning.giftCoinSource.createdAt.toISOString()
                                : earning.giftCoinSource.createdAt,
                            coinLot: earning.giftCoinSource.coinLot
                                ? {
                                    id: earning.giftCoinSource.coinLot.id,
                                    userId: earning.giftCoinSource.coinLot.userId,
                                    orderId: earning.giftCoinSource.coinLot.orderId,
                                    sourceType: earning.giftCoinSource.coinLot.sourceType,
                                    provider: earning.giftCoinSource.coinLot.provider,
                                    coinsPurchased: earning.giftCoinSource.coinLot.coinsPurchased,
                                    coinsRemaining: earning.giftCoinSource.coinLot.coinsRemaining,
                                    priceCents: earning.giftCoinSource.coinLot.priceCents,
                                    currency: earning.giftCoinSource.coinLot.currency,
                                    providerPaymentIntentId:
                                        earning.giftCoinSource.coinLot.providerPaymentIntentId,
                                    providerChargeId:
                                        earning.giftCoinSource.coinLot.providerChargeId,
                                    providerBalanceTransactionId:
                                        earning.giftCoinSource.coinLot.providerBalanceTransactionId,
                                    providerAvailableOn:
                                        earning.giftCoinSource.coinLot.providerAvailableOn instanceof Date
                                            ? earning.giftCoinSource.coinLot.providerAvailableOn.toISOString()
                                            : null,
                                    status: earning.giftCoinSource.coinLot.status,
                                }
                                : null,
                        }
                        : null,
                }))
                : [],
        };
    }

    private async addPayoutAudit(input: {
        actorAdminUserId: string;
        request: any;
        actionType: "VIEW" | "UPDATE" | "STATUS_CHANGE" | "SYSTEM_ACTION";
        actionCode: string;
        actionLabel: string;
        beforeState?: Record<string, unknown> | null;
        afterState?: Record<string, unknown> | null;
        diff?: Record<string, unknown> | null;
        metadata?: Record<string, unknown> | null;
        requestContext?: AdminAuditRequestContext | null;
    }) {
        const context = this.normalizeAuditContext(input.requestContext);

        await this.adminAudit.logEvent({
            actorAdminUserId: input.actorAdminUserId,
            actionType: input.actionType,
            actionCode: input.actionCode,
            actionLabel: input.actionLabel,
            resourceType: "payout_request",
            resourceId: input.request.id,
            target: {
                id: input.request.id,
                name: `Payout ${input.request.id}`,
                type: "payout_request",
            },
            references: {
                targetUserId: input.request.userId,
                targetPayoutRequestId: input.request.id,
            },
            requestPath: context.requestPath,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
            deviceLabel: context.deviceLabel,
            beforeState: input.beforeState ?? null,
            afterState: input.afterState ?? null,
            diff: input.diff ?? null,
            metadata: input.metadata ?? null,
        });
    }

    private async sendPayoutEmailSafely(
        category: EmailCategory,
        payoutRequest: any,
        extraCorrelation: Record<string, unknown> = {},
    ) {
        try {
            const user = payoutRequest.user;

            if (!user?.email) {
                return;
            }

            await this.email.sendCategorizedEmail({
                category,
                recipientEmail: user.email,
                recipientUserId: payoutRequest.userId,
                variables: {
                    displayName: user.profile?.displayName?.trim() || user.username,
                    username: user.username,
                    email: user.email,
                    payoutRequestId: payoutRequest.id,
                    diamondAmount: String(payoutRequest.diamondAmount),
                    grossAmount: this.formatCurrencyFromCents(payoutRequest.grossAmount),
                    feeAmount: this.formatCurrencyFromCents(payoutRequest.feeAmount),
                    netAmount: this.formatCurrencyFromCents(payoutRequest.netAmount),
                    status: payoutRequest.status,
                    provider: payoutRequest.provider || PayoutProvider.MANUAL,
                    paymentMethod: payoutRequest.paymentMethod || "",
                    createdAt:
                        payoutRequest.createdAt instanceof Date
                            ? payoutRequest.createdAt.toISOString()
                            : "",
                    processedAt:
                        payoutRequest.processedAt instanceof Date
                            ? payoutRequest.processedAt.toISOString()
                            : "",
                },
                correlation: {
                    type: "payout",
                    payoutRequestId: payoutRequest.id,
                    provider: payoutRequest.provider || PayoutProvider.MANUAL,
                    status: payoutRequest.status,
                    ...extraCorrelation,
                } as any,
            });
        } catch (error) {
            console.error("[EMAIL] Admin payout email send failed:", error);
        }
    }

    async list(adminUserId: string, query: AdminPayoutRequestsQueryDto) {
        await this.requireAdmin(adminUserId);

        const page = this.normalizePage(query.page, 1);
        const pageSize = this.normalizePageSize(query.pageSize, 25);
        const skip = (page - 1) * pageSize;

        const where: Prisma.PayoutRequestWhereInput = {};

        if (query.status) {
            where.status = query.status as PayoutStatus;
        }

        const search = this.normalizeOptionalString(query.search);
        if (search) {
            const isUuid =
                /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                    search,
                );

            where.OR = [
                ...(isUuid ? [{ id: search }] : []),
                {
                    user: {
                        email: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                },
                {
                    user: {
                        username: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                },
                {
                    paymentMethod: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
                {
                    providerPayoutId: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
            ];
        }

        const orderBy: Prisma.PayoutRequestOrderByWithRelationInput[] = (() => {
            switch (query.sort) {
                case "oldest":
                    return [{ createdAt: "asc" }];
                case "amount_desc":
                    return [{ netAmount: "desc" }, { createdAt: "desc" }];
                case "amount_asc":
                    return [{ netAmount: "asc" }, { createdAt: "desc" }];
                case "newest":
                default:
                    return [{ createdAt: "desc" }];
            }
        })();

        const [total, rows] = await Promise.all([
            this.prisma.payoutRequest.count({ where }),
            this.prisma.payoutRequest.findMany({
                where,
                skip,
                take: pageSize,
                orderBy,
                include: this.payoutInclude(),
            }),
        ]);

        return {
            page,
            pageSize,
            total,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
            items: rows.map((row) => this.mapPayoutRequest(row)),
        };
    }

    async getById(adminUserId: string, id: string) {
        await this.requireAdmin(adminUserId);

        const row = await this.prisma.payoutRequest.findUnique({
            where: { id },
            include: this.payoutInclude(),
        });

        if (!row) {
            throw new NotFoundException("Payout request not found.");
        }

        await this.addPayoutAudit({
            actorAdminUserId: adminUserId,
            request: row,
            actionType: "VIEW",
            actionCode: "payout.view",
            actionLabel: "Viewed payout request",
            metadata: {
                status: row.status,
                provider: row.provider,
            },
        });

        return {
            item: this.mapPayoutRequest(row),
        };
    }

    async updateNotes(
        adminUserId: string,
        id: string,
        body: UpdatePayoutRequestNotesDto,
        requestContext?: AdminAuditRequestContext | null,
    ) {
        await this.requireAdmin(adminUserId);

        const existing = await this.prisma.payoutRequest.findUnique({
            where: { id },
            include: this.payoutInclude(),
        });

        if (!existing) {
            throw new NotFoundException("Payout request not found.");
        }

        const updated = await this.prisma.payoutRequest.update({
            where: { id },
            data: {
                adminNotes: this.normalizeOptionalString(body.adminNotes),
            },
            include: this.payoutInclude(),
        });

        await this.addPayoutAudit({
            actorAdminUserId: adminUserId,
            request: updated,
            actionType: "UPDATE",
            actionCode: "payout.notes.update",
            actionLabel: "Updated payout notes",
            beforeState: {
                adminNotes: existing.adminNotes ?? null,
            },
            afterState: {
                adminNotes: updated.adminNotes ?? null,
            },
            diff: {
                adminNotes: {
                    before: existing.adminNotes ?? null,
                    after: updated.adminNotes ?? null,
                },
            },
            requestContext,
        });

        return {
            success: true,
            item: this.mapPayoutRequest(updated),
        };
    }

    async markProcessing(
        adminUserId: string,
        id: string,
        body: MarkPayoutProcessingDto,
        requestContext?: AdminAuditRequestContext | null,
    ) {
        await this.requireAdmin(adminUserId);

        const existing = await this.prisma.payoutRequest.findUnique({
            where: { id },
            include: this.payoutInclude(),
        });

        if (!existing) {
            throw new NotFoundException("Payout request not found.");
        }

        if (
            existing.status === PayoutStatus.PAID ||
            existing.status === PayoutStatus.REJECTED ||
            existing.status === PayoutStatus.CANCELLED ||
            existing.status === PayoutStatus.FAILED ||
            existing.status === PayoutStatus.RETURNED ||
            existing.status === PayoutStatus.UNCLAIMED
        ) {
            throw new BadRequestException(
                `Cannot mark payout as processing from status ${existing.status}.`,
            );
        }

        const provider = this.normalizeProvider(body.provider);

        const updated = await this.prisma.payoutRequest.update({
            where: { id },
            data: {
                status: PayoutStatus.PROCESSING,
                provider: provider ?? existing.provider,
                payoutMethodId: body.payoutMethodId ?? existing.payoutMethodId,
                providerBatchId:
                    this.normalizeOptionalString(body.providerBatchId) ??
                    existing.providerBatchId,
                providerPayoutId:
                    this.normalizeOptionalString(body.providerPayoutId) ??
                    existing.providerPayoutId,
                providerStatus:
                    this.normalizeOptionalString(body.providerStatus) ??
                    existing.providerStatus,
                providerResponse:
                    body.providerResponse === undefined
                        ? existing.providerResponse === null
                            ? undefined
                            : (existing.providerResponse as Prisma.InputJsonValue)
                        : (body.providerResponse as Prisma.InputJsonValue),
                adminNotes:
                    this.normalizeOptionalString(body.adminNotes) ??
                    existing.adminNotes,
            },
            include: this.payoutInclude(),
        });

        await this.addPayoutAudit({
            actorAdminUserId: adminUserId,
            request: updated,
            actionType: "STATUS_CHANGE",
            actionCode: "payout.processing",
            actionLabel: "Marked payout as processing",
            beforeState: {
                status: existing.status,
                provider: existing.provider,
                payoutMethodId: existing.payoutMethodId,
                providerPayoutId: existing.providerPayoutId,
                providerStatus: existing.providerStatus,
            },
            afterState: {
                status: updated.status,
                provider: updated.provider,
                payoutMethodId: updated.payoutMethodId,
                providerPayoutId: updated.providerPayoutId,
                providerStatus: updated.providerStatus,
            },
            diff: {
                status: {
                    before: existing.status,
                    after: updated.status,
                },
            },
            requestContext,
        });

        return {
            success: true,
            item: this.mapPayoutRequest(updated),
        };
    }

    async approve(
        adminUserId: string,
        id: string,
        body: ApprovePayoutRequestDto,
        requestContext?: AdminAuditRequestContext | null,
    ) {
        await this.requireAdmin(adminUserId);

        const existing = await this.prisma.payoutRequest.findUnique({
            where: { id },
            include: this.payoutInclude(),
        });

        if (!existing) {
            throw new NotFoundException("Payout request not found.");
        }

        if (existing.status === PayoutStatus.PAID) {
            throw new BadRequestException("Payout request is already paid.");
        }

        if (
            existing.status === PayoutStatus.REJECTED ||
            existing.status === PayoutStatus.CANCELLED ||
            existing.status === PayoutStatus.FAILED ||
            existing.status === PayoutStatus.RETURNED ||
            existing.status === PayoutStatus.UNCLAIMED
        ) {
            throw new BadRequestException(
                `Cannot approve payout from status ${existing.status}.`,
            );
        }

        const provider = this.normalizeProvider(body.provider);
        const paymentMethod = this.normalizeOptionalString(body.paymentMethod);
        const paymentReference = this.normalizeOptionalString(body.paymentReference);

        const updated = await this.prisma.$transaction(
            async (tx) => {
                const paidAt = new Date();

                const payout = await tx.payoutRequest.update({
                    where: { id },
                    data: {
                        status: PayoutStatus.PAID,
                        processedAt: paidAt,
                        paidAt,
                        provider: provider ?? existing.provider,
                        payoutMethodId: body.payoutMethodId ?? existing.payoutMethodId,
                        paymentMethod:
                            paymentMethod ?? existing.paymentMethod ?? "manual",
                        paymentDetails: paymentReference
                            ? {
                                ...(typeof existing.paymentDetails === "object" &&
                                    existing.paymentDetails !== null &&
                                    !Array.isArray(existing.paymentDetails)
                                    ? existing.paymentDetails
                                    : {}),
                                paymentReference,
                            }
                            : existing.paymentDetails === null
                                ? undefined
                                : (existing.paymentDetails as Prisma.InputJsonValue),
                        providerBatchId:
                            this.normalizeOptionalString(body.providerBatchId) ??
                            existing.providerBatchId,
                        providerPayoutId:
                            this.normalizeOptionalString(body.providerPayoutId) ??
                            paymentReference ??
                            existing.providerPayoutId,
                        providerStatus:
                            this.normalizeOptionalString(body.providerStatus) ??
                            "PAID",
                        providerResponse:
                            body.providerResponse === undefined
                                ? existing.providerResponse === null
                                    ? undefined
                                    : (existing.providerResponse as Prisma.InputJsonValue)
                                : (body.providerResponse as Prisma.InputJsonValue),
                        adminNotes:
                            this.normalizeOptionalString(body.adminNotes) ??
                            existing.adminNotes,
                    },
                    include: this.payoutInclude(),
                });

                await tx.streamerEarning.updateMany({
                    where: {
                        payoutRequestId: id,
                        status: StreamerEarningStatus.LOCKED,
                    },
                    data: {
                        status: StreamerEarningStatus.PAID,
                    },
                });

                return payout;
            },
            {
                isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            },
        );

        await this.sendPayoutEmailSafely(EmailCategory.PAYOUT_APPROVED, updated, {
            event: "payout_approved",
            initiatedByAdminUserId: adminUserId,
        });

        await this.sendPayoutEmailSafely(EmailCategory.PAYOUT_PROCESSED, updated, {
            event: "payout_processed",
            initiatedByAdminUserId: adminUserId,
        });

        await this.addPayoutAudit({
            actorAdminUserId: adminUserId,
            request: updated,
            actionType: "STATUS_CHANGE",
            actionCode: "payout.approve",
            actionLabel: "Approved payout request",
            beforeState: {
                status: existing.status,
                provider: existing.provider,
                paymentMethod: existing.paymentMethod ?? null,
                adminNotes: existing.adminNotes ?? null,
            },
            afterState: {
                status: updated.status,
                provider: updated.provider,
                paymentMethod: updated.paymentMethod ?? null,
                adminNotes: updated.adminNotes ?? null,
                processedAt: updated.processedAt
                    ? updated.processedAt.toISOString()
                    : null,
                paidAt: updated.paidAt ? updated.paidAt.toISOString() : null,
            },
            diff: {
                status: {
                    before: existing.status,
                    after: updated.status,
                },
            },
            metadata: {
                paymentMethod,
                paymentReference,
                provider: updated.provider,
                providerPayoutId: updated.providerPayoutId,
            },
            requestContext,
        });

        return {
            success: true,
            item: this.mapPayoutRequest(updated),
        };
    }

    async reject(
        adminUserId: string,
        id: string,
        body: RejectPayoutRequestDto,
        requestContext?: AdminAuditRequestContext | null,
    ) {
        await this.requireAdmin(adminUserId);

        const existing = await this.prisma.payoutRequest.findUnique({
            where: { id },
            include: this.payoutInclude(),
        });

        if (!existing) {
            throw new NotFoundException("Payout request not found.");
        }

        if (
            existing.status !== PayoutStatus.PENDING &&
            existing.status !== PayoutStatus.PROCESSING
        ) {
            throw new BadRequestException(
                `Only pending/processing payouts can be rejected. Current status: ${existing.status}.`,
            );
        }

        const lockedEarnings = Array.isArray(existing.earnings)
            ? existing.earnings.filter(
                (earning: any) => earning.status === StreamerEarningStatus.LOCKED,
            )
            : [];
        const lockedEarningIds = lockedEarnings.map((earning: any) => earning.id);
        const releasedDiamonds = lockedEarnings.reduce(
            (sum: number, earning: any) =>
                sum + Number(earning.diamondsEarned || 0),
            0,
        );

        const updated = await this.prisma.$transaction(
            async (tx) => {
                if (lockedEarningIds.length > 0) {
                    const released = await tx.streamerEarning.updateMany({
                        where: {
                            id: { in: lockedEarningIds },
                            payoutRequestId: id,
                            status: StreamerEarningStatus.LOCKED,
                        },
                        data: {
                            status: StreamerEarningStatus.AVAILABLE,
                            payoutRequestId: null,
                        },
                    });

                    if (released.count !== lockedEarningIds.length) {
                        throw new BadRequestException(
                            "Some payout earnings were no longer locked. Please refresh and try again.",
                        );
                    }

                    if (releasedDiamonds > 0) {
                        await tx.walletLedger.create({
                            data: {
                                userId: existing.userId,
                                type: LedgerEntryType.PAYOUT_REVERSAL,
                                deltaCoins: 0,
                                deltaDiamonds: releasedDiamonds,
                            },
                        });
                    }
                }

                return tx.payoutRequest.update({
                    where: { id },
                    data: {
                        status: PayoutStatus.REJECTED,
                        processedAt: new Date(),
                        adminNotes: this.normalizeOptionalString(body.adminNotes),
                    },
                    include: this.payoutInclude(),
                });
            },
            {
                isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            },
        );

        await this.sendPayoutEmailSafely(EmailCategory.PAYOUT_DENIED, updated, {
            event: "payout_rejected",
            initiatedByAdminUserId: adminUserId,
        });

        await this.addPayoutAudit({
            actorAdminUserId: adminUserId,
            request: updated,
            actionType: "STATUS_CHANGE",
            actionCode: "payout.reject",
            actionLabel: "Rejected payout request",
            beforeState: {
                status: existing.status,
                adminNotes: existing.adminNotes ?? null,
            },
            afterState: {
                status: updated.status,
                adminNotes: updated.adminNotes ?? null,
                processedAt: updated.processedAt
                    ? updated.processedAt.toISOString()
                    : null,
            },
            diff: {
                status: {
                    before: existing.status,
                    after: updated.status,
                },
            },
            metadata: {
                releasedEarningsCount: lockedEarningIds.length,
                releasedDiamonds,
            },
            requestContext,
        });

        return {
            success: true,
            releasedDiamonds,
            item: this.mapPayoutRequest(updated),
        };
    }

    async markFailedAndRelease(
        adminUserId: string,
        id: string,
        body: MarkPayoutFailedDto,
        requestContext?: AdminAuditRequestContext | null,
    ) {
        await this.requireAdmin(adminUserId);

        const existing = await this.prisma.payoutRequest.findUnique({
            where: { id },
            include: this.payoutInclude(),
        });

        if (!existing) {
            throw new NotFoundException("Payout request not found.");
        }

        if (
            existing.status !== PayoutStatus.PENDING &&
            existing.status !== PayoutStatus.PROCESSING
        ) {
            throw new BadRequestException(
                `Only pending/processing payouts can be failed/released. Current status: ${existing.status}.`,
            );
        }

        const nextStatus = this.normalizeFailureStatus(body.status);

        const lockedEarnings = Array.isArray(existing.earnings)
            ? existing.earnings.filter(
                (earning: any) => earning.status === StreamerEarningStatus.LOCKED,
            )
            : [];
        const lockedEarningIds = lockedEarnings.map((earning: any) => earning.id);
        const releasedDiamonds = lockedEarnings.reduce(
            (sum: number, earning: any) =>
                sum + Number(earning.diamondsEarned || 0),
            0,
        );

        const updated = await this.prisma.$transaction(
            async (tx) => {
                if (lockedEarningIds.length > 0) {
                    const released = await tx.streamerEarning.updateMany({
                        where: {
                            id: { in: lockedEarningIds },
                            payoutRequestId: id,
                            status: StreamerEarningStatus.LOCKED,
                        },
                        data: {
                            status: StreamerEarningStatus.AVAILABLE,
                            payoutRequestId: null,
                        },
                    });

                    if (released.count !== lockedEarningIds.length) {
                        throw new BadRequestException(
                            "Some payout earnings were no longer locked. Please refresh and try again.",
                        );
                    }

                    if (releasedDiamonds > 0) {
                        await tx.walletLedger.create({
                            data: {
                                userId: existing.userId,
                                type: LedgerEntryType.PAYOUT_REVERSAL,
                                deltaCoins: 0,
                                deltaDiamonds: releasedDiamonds,
                            },
                        });
                    }
                }

                return tx.payoutRequest.update({
                    where: { id },
                    data: {
                        status: nextStatus,
                        processedAt: new Date(),
                        failedAt:
                            nextStatus === PayoutStatus.FAILED
                                ? new Date()
                                : existing.failedAt,
                        adminNotes:
                            this.normalizeOptionalString(body.adminNotes) ??
                            existing.adminNotes,
                        providerStatus:
                            this.normalizeOptionalString(body.providerStatus) ??
                            existing.providerStatus,
                        providerResponse:
                            body.providerResponse === undefined
                                ? existing.providerResponse === null
                                    ? undefined
                                    : (existing.providerResponse as Prisma.InputJsonValue)
                                : (body.providerResponse as Prisma.InputJsonValue),
                    },
                    include: this.payoutInclude(),
                });
            },
            {
                isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            },
        );

        await this.sendPayoutEmailSafely(EmailCategory.PAYOUT_DENIED, updated, {
            event: "payout_failed_or_released",
            initiatedByAdminUserId: adminUserId,
            status: nextStatus,
        });

        await this.addPayoutAudit({
            actorAdminUserId: adminUserId,
            request: updated,
            actionType: "STATUS_CHANGE",
            actionCode: "payout.fail_release",
            actionLabel: "Marked payout failed and released earnings",
            beforeState: {
                status: existing.status,
                providerStatus: existing.providerStatus ?? null,
            },
            afterState: {
                status: updated.status,
                providerStatus: updated.providerStatus ?? null,
                failedAt: updated.failedAt ? updated.failedAt.toISOString() : null,
            },
            diff: {
                status: {
                    before: existing.status,
                    after: updated.status,
                },
            },
            metadata: {
                releasedEarnings: lockedEarningIds.length > 0,
                releasedEarningsCount: lockedEarningIds.length,
                releasedDiamonds,
            },
            requestContext,
        });

        return {
            success: true,
            releasedDiamonds,
            item: this.mapPayoutRequest(updated),
        };
    }

    async getSummary(adminUserId: string, query: AdminPayoutSummaryQueryDto) {
        await this.requireAdmin(adminUserId);

        const where: Prisma.PayoutRequestWhereInput = {};

        if (query.status) {
            where.status = query.status as PayoutStatus;
        }

        const grouped = await this.prisma.payoutRequest.groupBy({
            by: ["status"],
            where,
            _count: {
                _all: true,
            },
            _sum: {
                diamondAmount: true,
                grossAmount: true,
                feeAmount: true,
                netAmount: true,
            },
        });

        const pendingEarnings = await this.prisma.streamerEarning.groupBy({
            by: ["status"],
            _count: {
                _all: true,
            },
            _sum: {
                diamondsEarned: true,
                streamerAmountCents: true,
            },
        });

        return {
            payoutRequests: grouped.map((row) => ({
                status: row.status,
                count: row._count._all,
                diamondAmount: row._sum.diamondAmount ?? 0,
                grossAmount: row._sum.grossAmount ?? 0,
                feeAmount: row._sum.feeAmount ?? 0,
                netAmount: row._sum.netAmount ?? 0,
            })),
            streamerEarnings: pendingEarnings.map((row) => ({
                status: row.status,
                count: row._count._all,
                diamondsEarned: row._sum.diamondsEarned ?? 0,
                streamerAmountCents: row._sum.streamerAmountCents ?? 0,
            })),
        };
    }
}
