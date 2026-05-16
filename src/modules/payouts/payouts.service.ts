import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import {
  EmailCategory,
  LedgerEntryType,
  PayoutProvider,
  PayoutStatus,
  Prisma,
  StreamerEarningStatus,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

type RequestPayoutOptions = {
  diamondAmount?: number;
  requestedAmountCents?: number;
  payoutMethodId?: string | null;
  provider?: 'MANUAL' | 'STRIPE' | 'PAYPAL' | PayoutProvider;
  idempotencyKey?: string;
  paymentMethod?: string | null;
  paymentDetails?: unknown;
};

type LockedEarningRow = {
  id: string;
  diamonds_earned: number;
  gross_amount_cents: number;
  platform_fee_cents: number;
  streamer_amount_cents: number;
};

@Injectable()
export class PayoutsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) { }

  private normalizeProvider(value?: string | PayoutProvider | null): PayoutProvider {
    const normalized = String(value || PayoutProvider.MANUAL).trim().toUpperCase();

    if (normalized === PayoutProvider.STRIPE) return PayoutProvider.STRIPE;
    if (normalized === PayoutProvider.PAYPAL) return PayoutProvider.PAYPAL;

    return PayoutProvider.MANUAL;
  }

  private normalizeOptionalString(value?: string | null) {
    const normalized = String(value || '').trim();
    return normalized ? normalized : null;
  }

  private formatCurrencyFromCents(value: number | null | undefined) {
    const cents = Number(value ?? 0);

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  }

  private mapPayoutRequest(row: any) {
    return {
      id: row.id,
      userId: row.userId,
      diamondAmount: row.diamondAmount,
      grossAmount: row.grossAmount ?? 0,
      feeAmount: row.feeAmount ?? 0,
      netAmount: row.netAmount,
      status: row.status,
      idempotencyKey: row.idempotencyKey ?? null,

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

      earningsCount: Array.isArray(row.earnings) ? row.earnings.length : undefined,
      earnings: Array.isArray(row.earnings)
        ? row.earnings.map((earning: any) => ({
          id: earning.id,
          diamondsEarned: earning.diamondsEarned,
          streamerAmountCents: earning.streamerAmountCents,
          status: earning.status,
          availableAt: earning.availableAt instanceof Date
            ? earning.availableAt.toISOString()
            : earning.availableAt,
          createdAt: earning.createdAt instanceof Date
            ? earning.createdAt.toISOString()
            : earning.createdAt,
        }))
        : undefined,
    };
  }

  async getCreatorEarningsSummary(userId: string) {
    const grouped = await this.prisma.streamerEarning.groupBy({
      by: ['status'],
      where: {
        streamerUserId: userId,
      },
      _sum: {
        diamondsEarned: true,
        streamerAmountCents: true,
      },
    });

    const empty = {
      diamonds: 0,
      amountCents: 0,
    };

    const byStatus: Record<string, { diamonds: number; amountCents: number }> = {
      [StreamerEarningStatus.PENDING]: { ...empty },
      [StreamerEarningStatus.AVAILABLE]: { ...empty },
      [StreamerEarningStatus.LOCKED]: { ...empty },
      [StreamerEarningStatus.PAID]: { ...empty },
      [StreamerEarningStatus.REVERSED]: { ...empty },
    };

    for (const row of grouped) {
      byStatus[row.status] = {
        diamonds: Number(row._sum.diamondsEarned ?? 0),
        amountCents: Number(row._sum.streamerAmountCents ?? 0),
      };
    }

    return {
      pendingDiamonds: byStatus[StreamerEarningStatus.PENDING].diamonds,
      pendingAmountCents: byStatus[StreamerEarningStatus.PENDING].amountCents,

      availableDiamonds: byStatus[StreamerEarningStatus.AVAILABLE].diamonds,
      availableAmountCents: byStatus[StreamerEarningStatus.AVAILABLE].amountCents,

      lockedDiamonds: byStatus[StreamerEarningStatus.LOCKED].diamonds,
      lockedAmountCents: byStatus[StreamerEarningStatus.LOCKED].amountCents,

      paidDiamonds: byStatus[StreamerEarningStatus.PAID].diamonds,
      paidAmountCents: byStatus[StreamerEarningStatus.PAID].amountCents,

      reversedDiamonds: byStatus[StreamerEarningStatus.REVERSED].diamonds,
      reversedAmountCents: byStatus[StreamerEarningStatus.REVERSED].amountCents,

      availableToCashOutLabel: this.formatCurrencyFromCents(
        byStatus[StreamerEarningStatus.AVAILABLE].amountCents,
      ),
      pendingClearanceLabel: this.formatCurrencyFromCents(
        byStatus[StreamerEarningStatus.PENDING].amountCents,
      ),
    };
  }

  async getHistory(userId: string) {
    const rows = await this.prisma.payoutRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        payoutMethod: true,
        earnings: {
          orderBy: [{ availableAt: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            diamondsEarned: true,
            streamerAmountCents: true,
            status: true,
            availableAt: true,
            createdAt: true,
          },
        },
      },
    });

    return {
      items: rows.map((row) => this.mapPayoutRequest(row)),
    };
  }

  async requestPayout(
    userId: string,
    amountOrOptions?: number | RequestPayoutOptions,
  ) {
    const options: RequestPayoutOptions =
      typeof amountOrOptions === 'number'
        ? { diamondAmount: amountOrOptions }
        : amountOrOptions ?? {};

    const requestedDiamondAmount = Number(options.diamondAmount ?? 0);
    const requestedAmountCents = Number(options.requestedAmountCents ?? 0);
    const provider = this.normalizeProvider(options.provider);
    const idempotencyKey = this.normalizeOptionalString(options.idempotencyKey);

    if (idempotencyKey) {
      const existing = await this.prisma.payoutRequest.findUnique({
        where: {
          userId_idempotencyKey: {
            userId,
            idempotencyKey,
          },
        },
        include: {
          user: {
            include: {
              profile: true,
            },
          },
          payoutMethod: true,
          earnings: {
            orderBy: [{ availableAt: 'asc' }, { createdAt: 'asc' }],
          },
        },
      });

      if (existing) {
        return {
          ok: true,
          idempotent: true,
          request: this.mapPayoutRequest(existing),
        };
      }
    }

    if (requestedDiamondAmount > 0 && requestedDiamondAmount < 5000) {
      throw new BadRequestException('Minimum payout threshold is 5,000 diamonds.');
    }

    if (requestedAmountCents > 0 && requestedAmountCents < 5000) {
      throw new BadRequestException('Minimum payout threshold is $50.00.');
    }

    const outcome = await this.prisma.$transaction(
      async (tx) => {
        if (idempotencyKey) {
          const existing = await tx.payoutRequest.findUnique({
            where: {
              userId_idempotencyKey: {
                userId,
                idempotencyKey,
              },
            },
            include: {
              user: {
                include: {
                  profile: true,
                },
              },
              payoutMethod: true,
              earnings: {
                orderBy: [{ availableAt: 'asc' }, { createdAt: 'asc' }],
              },
            },
          });

          if (existing) {
            return {
              reused: true as const,
              request: existing,
            };
          }
        }

        const now = new Date();

        const eligible = await tx.$queryRaw<LockedEarningRow[]>`
          SELECT
            id,
            diamonds_earned,
            gross_amount_cents,
            platform_fee_cents,
            streamer_amount_cents
          FROM streamer_earnings
          WHERE streamer_user_id = ${userId}::uuid
            AND status = 'AVAILABLE'
            AND available_at <= ${now}
            AND payout_request_id IS NULL
          ORDER BY available_at ASC, created_at ASC
          FOR UPDATE
        `;

        if (eligible.length === 0) {
          throw new BadRequestException('No available creator earnings to cash out.');
        }

        const selected: LockedEarningRow[] = [];
        let selectedDiamonds = 0;
        let selectedNetAmountCents = 0;

        for (const earning of eligible) {
          if (
            requestedDiamondAmount > 0 &&
            selectedDiamonds >= requestedDiamondAmount
          ) {
            break;
          }

          if (
            requestedAmountCents > 0 &&
            selectedNetAmountCents >= requestedAmountCents
          ) {
            break;
          }

          selected.push(earning);
          selectedDiamonds += Number(earning.diamonds_earned || 0);
          selectedNetAmountCents += Number(earning.streamer_amount_cents || 0);
        }

        if (selected.length === 0) {
          throw new BadRequestException('No available creator earnings to cash out.');
        }

        if (selectedDiamonds < 5000) {
          throw new BadRequestException('Minimum payout threshold is 5,000 diamonds.');
        }

        const diamondAmount = selected.reduce(
          (sum, row) => sum + Number(row.diamonds_earned || 0),
          0,
        );
        const grossAmount = selected.reduce(
          (sum, row) => sum + Number(row.gross_amount_cents || 0),
          0,
        );
        const feeAmount = selected.reduce(
          (sum, row) => sum + Number(row.platform_fee_cents || 0),
          0,
        );
        const netAmount = selected.reduce(
          (sum, row) => sum + Number(row.streamer_amount_cents || 0),
          0,
        );

        const paymentDetails =
          options.paymentDetails === undefined
            ? undefined
            : (options.paymentDetails as Prisma.InputJsonValue);

        const payoutRequest = await tx.payoutRequest.create({
          data: {
            userId,
            idempotencyKey,
            diamondAmount,
            grossAmount,
            feeAmount,
            netAmount,
            provider,
            payoutMethodId: options.payoutMethodId ?? null,
            paymentMethod: this.normalizeOptionalString(options.paymentMethod),
            paymentDetails,
            status:
              provider === PayoutProvider.MANUAL
                ? PayoutStatus.PENDING
                : PayoutStatus.PROCESSING,
          },
          include: {
            user: {
              include: {
                profile: true,
              },
            },
            payoutMethod: true,
            earnings: true,
          },
        });

        const earningIds = selected.map((earning) => earning.id);

        const locked = await tx.streamerEarning.updateMany({
          where: {
            id: { in: earningIds },
            streamerUserId: userId,
            status: StreamerEarningStatus.AVAILABLE,
            payoutRequestId: null,
            availableAt: { lte: now },
          },
          data: {
            status: StreamerEarningStatus.LOCKED,
            payoutRequestId: payoutRequest.id,
          },
        });

        if (locked.count !== earningIds.length) {
          throw new BadRequestException(
            'Some earnings were no longer available. Please try again.',
          );
        }

        await tx.walletLedger.create({
          data: {
            userId,
            type: LedgerEntryType.PAYOUT_DEBIT,
            deltaCoins: 0,
            deltaDiamonds: -diamondAmount,
          },
        });

        const request = await tx.payoutRequest.findUniqueOrThrow({
          where: { id: payoutRequest.id },
          include: {
            user: {
              include: {
                profile: true,
              },
            },
            payoutMethod: true,
            earnings: {
              orderBy: [{ availableAt: 'asc' }, { createdAt: 'asc' }],
            },
          },
        });

        return {
          reused: false as const,
          request,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    if (!outcome.reused) {
      await this.sendPayoutEmailSafely(EmailCategory.PAYOUT_REQUEST_RECEIVED, outcome.request, {
        event: 'payout_requested',
      });
    }

    return {
      ok: true,
      idempotent: outcome.reused,
      request: this.mapPayoutRequest(outcome.request),
    };
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
          paymentMethod: payoutRequest.paymentMethod || '',
          createdAt:
            payoutRequest.createdAt instanceof Date
              ? payoutRequest.createdAt.toISOString()
              : '',
          processedAt:
            payoutRequest.processedAt instanceof Date
              ? payoutRequest.processedAt.toISOString()
              : '',
        },
        correlation: {
          type: 'payout',
          payoutRequestId: payoutRequest.id,
          provider: payoutRequest.provider || PayoutProvider.MANUAL,
          status: payoutRequest.status,
          ...extraCorrelation,
        } as any,
      });
    } catch (error) {
      console.error('[EMAIL] Payout email send failed:', error);
    }
  }
}
