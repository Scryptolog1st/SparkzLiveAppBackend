import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CoinLotSourceType,
  CoinLotStatus,
  EmailCategory,
  LedgerEntryType,
  Prisma,
  PurchaseProvider,
  PurchaseStatus,
  StreamerEarningStatus,
  VipBadgeKey,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import { PrismaService } from '../prisma/prisma.service';
import { AppleIapVerifyDto } from './dto/apple-iap-verify.dto';
import { GoogleIapVerifyDto } from './dto/google-iap-verify.dto';

import { Environment, SignedDataVerifier } from '@apple/app-store-server-library';
import { JWT } from 'google-auth-library';
const Stripe = require('stripe');
import { EmailService } from '../email/email.service';

type GoogleProductPurchase = {
  kind?: string;
  purchaseTimeMillis?: string;
  purchaseState?: number;
  consumptionState?: number;
  orderId?: string;
  purchaseType?: number;
  acknowledgementState?: number;
  purchaseToken?: string;
  productId?: string;
  quantity?: number;
  refundableQuantity?: number;
  regionCode?: string;
  obfuscatedExternalAccountId?: string;
  obfuscatedExternalProfileId?: string;
};

type FundingRefs = {
  providerRef?: string | null;
  providerPaymentIntentId?: string | null;
  providerChargeId?: string | null;
  providerBalanceTransactionId?: string | null;
  providerAvailableOn?: Date | null;
  metadataJson?: Prisma.InputJsonValue;
};

type VipBadgeMeta = {
  label: string;
  compatibilityTone: string;
  displayRank: number;
};

const LIVE_COLOR_VIP_THRESHOLDS: Array<{
  key: VipBadgeKey;
  minSpendCents: number;
}> = [
    { key: VipBadgeKey.GREEN, minSpendCents: 10_000 },
    { key: VipBadgeKey.YELLOW, minSpendCents: 25_000 },
    { key: VipBadgeKey.ORANGE, minSpendCents: 50_000 },
    { key: VipBadgeKey.RED, minSpendCents: 90_000 },
    { key: VipBadgeKey.PINK, minSpendCents: 140_000 },
    { key: VipBadgeKey.PURPLE, minSpendCents: 210_000 },
    { key: VipBadgeKey.BLACK, minSpendCents: 300_000 },
  ];

const VIP_BADGE_META: Record<VipBadgeKey, VipBadgeMeta> = {
  [VipBadgeKey.GREEN]: {
    label: 'Green',
    compatibilityTone: 'green',
    displayRank: 1,
  },
  [VipBadgeKey.YELLOW]: {
    label: 'Yellow',
    compatibilityTone: 'yellow',
    displayRank: 2,
  },
  [VipBadgeKey.ORANGE]: {
    label: 'Orange',
    compatibilityTone: 'orange',
    displayRank: 3,
  },
  [VipBadgeKey.RED]: {
    label: 'Red',
    compatibilityTone: 'red',
    displayRank: 4,
  },
  [VipBadgeKey.PINK]: {
    label: 'Pink',
    compatibilityTone: 'pink',
    displayRank: 5,
  },
  [VipBadgeKey.PURPLE]: {
    label: 'Purple',
    compatibilityTone: 'purple',
    displayRank: 6,
  },
  [VipBadgeKey.BLACK]: {
    label: 'Black',
    compatibilityTone: 'neutral',
    displayRank: 7,
  },
  [VipBadgeKey.GOLD]: {
    label: 'Gold',
    compatibilityTone: 'amber',
    displayRank: 8,
  },
  [VipBadgeKey.PLATINUM]: {
    label: 'Platinum',
    compatibilityTone: 'slate',
    displayRank: 9,
  },
  [VipBadgeKey.DIAMOND]: {
    label: 'Diamond',
    compatibilityTone: 'cyan',
    displayRank: 10,
  },
  [VipBadgeKey.ANODIZED_TITANIUM]: {
    label: 'Anodized Titanium',
    compatibilityTone: 'indigo',
    displayRank: 11,
  },
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) { }

  private appleVerifier?: SignedDataVerifier;
  private googleJwt?: JWT;
  private stripeClient?: any;

  private parseCsvEnv(name: string) {
    return new Set(
      String(process.env[name] || '')
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    );
  }

  private getStripeClient(): any {
    const secretKey = String(process.env.STRIPE_SECRET_KEY || '').trim();

    if (!secretKey) {
      throw new BadRequestException('Stripe is not configured on the backend.');
    }

    if (!this.stripeClient) {
      this.stripeClient = new Stripe(secretKey);
    }

    return this.stripeClient;
  }

  private getAppWebUrl(): string {
    const raw = String(process.env.APP_WEB_URL || 'https://sparkzlive.com')
      .trim()
      .replace(/\/$/, '');

    try {
      return new URL(raw).toString().replace(/\/$/, '');
    } catch {
      return 'https://sparkzlive.com';
    }
  }

  private packageDisplayName(id: string, coins?: number): string {
    if (coins && coins > 0) {
      return `${coins.toLocaleString()} SparkzLive Coins`;
    }

    const normalized = String(id || '').trim();
    const coinsMatch = normalized.match(/^coins[_-](\d+)$/i);

    if (coinsMatch) {
      return `${Number(coinsMatch[1]).toLocaleString()} SparkzLive Coins`;
    }

    return normalized
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  private buildStripeMetadata(order: {
    id: string;
    userId: string;
    packageId: string;
    coins: number;
    priceCents: number;
    currency: string;
  }): Record<string, string> {
    return {
      orderId: order.id,
      purchaseOrderId: order.id,
      userId: order.userId,
      packageId: order.packageId,
      coins: String(order.coins),
      priceCents: String(order.priceCents),
      currency: order.currency || 'USD',
    };
  }

  private async createStripeCheckoutForOrder(orderId: string) {
    const stripe = this.getStripeClient();

    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id: orderId },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
        pkg: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.provider !== PurchaseProvider.STRIPE) {
      throw new BadRequestException('Order is not a Stripe order');
    }

    if (order.status === PurchaseStatus.FULFILLED) {
      return {
        checkoutUrl: null,
        checkoutSessionId: order.providerRef,
        alreadyFulfilled: true,
      };
    }

    if (order.status !== PurchaseStatus.PENDING && order.status !== PurchaseStatus.PAID) {
      throw new BadRequestException(`Order cannot be checked out while status=${order.status}`);
    }

    if (order.priceCents <= 0) {
      throw new BadRequestException('Stripe checkout requires a paid coin package');
    }

    if (order.providerRef) {
      try {
        const existingSession = await stripe.checkout.sessions.retrieve(order.providerRef);

        if (existingSession.status === 'open' && existingSession.url) {
          return {
            checkoutUrl: existingSession.url,
            checkoutSessionId: existingSession.id,
            reusedCheckoutSession: true,
          };
        }
      } catch {
        // If the old session cannot be retrieved or is expired, create a new one below.
      }
    }

    const metadata = this.buildStripeMetadata(order);
    const webUrl = this.getAppWebUrl();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: order.user.email || undefined,
      client_reference_id: order.id,
      allow_promotion_codes: true,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: String(order.currency || 'USD').toLowerCase(),
            unit_amount: order.priceCents,
            product_data: {
              name: this.packageDisplayName(order.packageId, order.coins),
              description: `${order.coins.toLocaleString()} coins for SparkzLive`,
              metadata: {
                packageId: order.packageId,
              },
            },
          },
        },
      ],
      metadata,
      payment_intent_data: {
        metadata,
      },
      success_url: `${webUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${webUrl}/checkout/canceled?order_id=${encodeURIComponent(order.id)}`,
    });

    await this.prisma.purchaseOrder.update({
      where: { id: order.id },
      data: {
        providerRef: session.id,
      },
    });

    return {
      checkoutUrl: session.url,
      checkoutSessionId: session.id,
      reusedCheckoutSession: false,
    };
  }

  async getStripeCheckoutSession(userId: string, sessionId: string) {
    const normalizedSessionId = String(sessionId || '').trim();

    if (!normalizedSessionId) {
      throw new BadRequestException('Stripe checkout session ID is required');
    }

    const session = await this.getStripeClient().checkout.sessions.retrieve(normalizedSessionId);

    const orderId = String(
      session.metadata?.orderId ||
      session.metadata?.purchaseOrderId ||
      session.client_reference_id ||
      '',
    ).trim();

    if (!orderId) {
      throw new NotFoundException('Purchase order was not found for this checkout session');
    }

    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id: orderId },
      include: {
        pkg: true,
        coinLots: true,
        user: {
          include: {
            profile: true,
            wallet: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException();
    }

    return {
      ok: true,
      session: {
        id: session.id,
        status: session.status,
        paymentStatus: session.payment_status,
        amountTotal: session.amount_total ?? order.priceCents,
        currency: String(session.currency || order.currency || 'USD').toUpperCase(),
        customerEmail:
          session.customer_details?.email ||
          session.customer_email ||
          order.user.email ||
          null,
      },
      order: {
        id: order.id,
        provider: order.provider,
        providerRef: order.providerRef,
        status: order.status,
        coins: order.coins,
        priceCents: order.priceCents,
        currency: order.currency,
        createdAt: order.createdAt.toISOString(),
        paidAt: order.paidAt ? order.paidAt.toISOString() : null,
        fulfilledAt: order.fulfilledAt ? order.fulfilledAt.toISOString() : null,
        coinLots: order.coinLots.map((lot) => ({
          id: lot.id,
          sourceType: lot.sourceType,
          provider: lot.provider,
          coinsPurchased: lot.coinsPurchased,
          coinsRemaining: lot.coinsRemaining,
          status: lot.status,
          providerPaymentIntentId: lot.providerPaymentIntentId,
          providerChargeId: lot.providerChargeId,
          providerBalanceTransactionId: lot.providerBalanceTransactionId,
          providerAvailableOn: lot.providerAvailableOn
            ? lot.providerAvailableOn.toISOString()
            : null,
        })),
        package: {
          id: order.pkg.id,
          displayName: this.packageDisplayName(order.pkg.id, order.pkg.coins),
          coins: order.pkg.coins,
          priceCents: order.pkg.priceCents,
          currency: order.pkg.currency,
          badgeText: order.pkg.badgeText,
          colorPreset: order.pkg.colorPreset,
          isFeatured: order.pkg.isFeatured,
        },
        user: {
          id: order.user.id,
          publicId: order.user.publicId,
          username: order.user.username,
          email: order.user.email,
          displayName: order.user.profile?.displayName?.trim() || order.user.username,
          walletCoins: order.user.wallet?.coins ?? 0,
        },
      },
    };
  }

  private getCustomerEmailTimeZone(): string {
    const raw = String(
      process.env.CUSTOMER_EMAIL_TIME_ZONE ||
      process.env.APP_TIME_ZONE ||
      'America/New_York',
    ).trim();

    try {
      new Intl.DateTimeFormat('en-US', { timeZone: raw }).format(new Date());
      return raw;
    } catch {
      return 'America/New_York';
    }
  }

  private formatEmailDateTime(value: Date | null | undefined): string {
    if (!(value instanceof Date)) {
      return '';
    }

    return new Intl.DateTimeFormat('en-US', {
      timeZone: this.getCustomerEmailTimeZone(),
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(value);
  }

  private formatCurrencyAmount(priceCents: number | null | undefined, currency?: string | null) {
    const normalizedCurrency = String(currency || 'USD').trim().toUpperCase() || 'USD';
    const cents = Number(priceCents || 0);

    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: normalizedCurrency,
      }).format(cents / 100);
    } catch {
      return `$${(cents / 100).toFixed(2)}`;
    }
  }

  private async sendPurchaseConfirmationSafely(orderId: string) {
    try {
      const order = await this.prisma.purchaseOrder.findUnique({
        where: { id: orderId },
        include: {
          user: {
            include: {
              profile: true,
            },
          },
          pkg: {
            select: {
              id: true,
              coins: true,
              priceCents: true,
              currency: true,
              badgeText: true,
            },
          },
        },
      });

      if (!order?.user?.email) {
        return;
      }

      const packageLabel =
        order.pkg?.badgeText?.trim() ||
        this.packageDisplayName(order.pkg?.id || order.packageId, order.pkg?.coins || order.coins);

      const amount = this.formatCurrencyAmount(
        order.priceCents ?? order.pkg?.priceCents,
        order.currency || order.pkg?.currency || 'USD',
      );

      await this.email.sendCategorizedEmail({
        category: EmailCategory.PURCHASE_CONFIRMATION,
        recipientEmail: order.user.email,
        recipientUserId: order.userId,
        variables: {
          displayName: order.user.profile?.displayName?.trim() || order.user.username,
          username: order.user.username,
          email: order.user.email,
          orderId: order.id,

          packageId: order.packageId,

          // Required by PURCHASE_CONFIRMATION template definition.
          packageName: packageLabel,
          amount,

          // Backward/forward-compatible aliases for custom templates.
          packageLabel,
          coinAmount: String(order.coins),
          priceCents: String(order.priceCents),
          currency: order.currency || order.pkg?.currency || 'USD',

          provider: order.provider,
          providerRef: order.providerRef || '',
          paidAt: this.formatEmailDateTime(order.paidAt),
          fulfilledAt: this.formatEmailDateTime(order.fulfilledAt),
        },
        correlation: {
          type: 'purchase_confirmation',
          purchaseOrderId: order.id,
          provider: order.provider,
          providerRef: order.providerRef || null,
        } as any,
      });
    } catch (error) {
      console.error('[EMAIL] Purchase confirmation send failed:', error);
    }
  }

  private async isUserAdmin(userId?: string): Promise<boolean> {
    if (!userId) return false;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
      },
    });

    if (!user) return false;

    const adminIds = this.parseCsvEnv('ADMIN_USER_IDS');
    const adminEmails = this.parseCsvEnv('ADMIN_EMAILS');
    const adminUsernames = this.parseCsvEnv('ADMIN_USERNAMES');

    return (
      adminIds.has(String(user.id).toLowerCase()) ||
      adminEmails.has(String(user.email).toLowerCase()) ||
      adminUsernames.has(String(user.username).toLowerCase())
    );
  }

  private getVipMonthTimezone(): string {
    const raw = String(process.env.VIP_MONTH_TIMEZONE || 'America/New_York').trim();

    try {
      new Intl.DateTimeFormat('en-US', { timeZone: raw }).format(new Date());
      return raw;
    } catch {
      return 'America/New_York';
    }
  }

  private getVipPeriodKey(date = new Date()): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: this.getVipMonthTimezone(),
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(date);

    const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
    const month = parts.find((part) => part.type === 'month')?.value ?? '01';

    return `${year}-${month}`;
  }

  private getVipBadgeRank(key?: VipBadgeKey | null): number {
    if (!key) return 0;
    return VIP_BADGE_META[key]?.displayRank ?? 0;
  }

  private pickHigherVipBadge(
    left?: VipBadgeKey | null,
    right?: VipBadgeKey | null,
  ): VipBadgeKey | null {
    if (!left && !right) return null;
    if (!left) return right ?? null;
    if (!right) return left ?? null;

    return this.getVipBadgeRank(left) >= this.getVipBadgeRank(right) ? left : right;
  }

  private resolveLiveColorVipBadge(spendCents: number): VipBadgeKey | null {
    let resolved: VipBadgeKey | null = null;

    for (const threshold of LIVE_COLOR_VIP_THRESHOLDS) {
      if (spendCents >= threshold.minSpendCents) {
        resolved = threshold.key;
      }
    }

    return resolved;
  }

  private getVipBadgeMeta(key?: VipBadgeKey | null): VipBadgeMeta | null {
    if (!key) return null;
    return VIP_BADGE_META[key] ?? null;
  }

  private async ensureProfileExists(tx: Prisma.TransactionClient, userId: string) {
    const existing = await tx.profile.findUnique({
      where: { userId },
      select: { userId: true },
    });

    if (existing) return existing;

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    return tx.profile.create({
      data: {
        userId,
        displayName: user?.username || 'User',
        showBadgeOnProfile: true,
      },
      select: { userId: true },
    });
  }

  private async syncProfileVipState(
    tx: Prisma.TransactionClient,
    userId: string,
    liveBadgeKey: VipBadgeKey | null,
  ) {
    await this.ensureProfileExists(tx, userId);

    const profile = await tx.profile.findUnique({
      where: { userId },
      select: {
        userId: true,
        vipLockedBadgeKey: true,
      },
    });

    const lockedBadgeKey = (profile?.vipLockedBadgeKey as VipBadgeKey | null) ?? null;
    const displayBadgeKey = this.pickHigherVipBadge(lockedBadgeKey, liveBadgeKey);
    const badgeMeta = this.getVipBadgeMeta(displayBadgeKey);

    await tx.profile.update({
      where: { userId },
      data: {
        vipLiveBadgeKey: liveBadgeKey,
        vipDisplayBadgeKey: displayBadgeKey,
        badgeLabel: badgeMeta?.label ?? null,
        badgeTone: badgeMeta?.compatibilityTone ?? null,
      },
    });
  }

  private async applyVipPurchaseProgress(
    tx: Prisma.TransactionClient,
    userId: string,
    purchaseAmountCents: number,
  ) {
    if (purchaseAmountCents <= 0) {
      return null;
    }

    const now = new Date();
    const periodKey = this.getVipPeriodKey(now);
    const initialLiveBadgeKey = this.resolveLiveColorVipBadge(purchaseAmountCents);

    const progress = await tx.userVipMonth.upsert({
      where: {
        userId_periodKey: {
          userId,
          periodKey,
        },
      },
      create: {
        userId,
        periodKey,
        spendCents: purchaseAmountCents,
        highestColorBadge: initialLiveBadgeKey,
        highestColorReachedAt: initialLiveBadgeKey ? now : null,
      },
      update: {
        spendCents: {
          increment: purchaseAmountCents,
        },
      },
      select: {
        userId: true,
        periodKey: true,
        spendCents: true,
        highestColorBadge: true,
      },
    });

    const nextLiveBadgeKey = this.resolveLiveColorVipBadge(progress.spendCents);
    const storedHighestColorBadge = (progress.highestColorBadge as VipBadgeKey | null) ?? null;

    if (
      nextLiveBadgeKey &&
      this.getVipBadgeRank(nextLiveBadgeKey) > this.getVipBadgeRank(storedHighestColorBadge)
    ) {
      await tx.userVipMonth.update({
        where: {
          userId_periodKey: {
            userId,
            periodKey,
          },
        },
        data: {
          highestColorBadge: nextLiveBadgeKey,
          highestColorReachedAt: now,
        },
      });
    }

    await this.syncProfileVipState(tx, userId, nextLiveBadgeKey);

    return {
      periodKey,
      spendCents: progress.spendCents,
      liveBadgeKey: nextLiveBadgeKey,
    };
  }

  async addDevCoins(userId: string, coins: number) {
    if (!Number.isFinite(Number(coins)) || Number(coins) <= 0) {
      throw new BadRequestException('Amount of coins must be positive.');
    }

    const normalizedCoins = Math.floor(Number(coins));

    return this.prisma.$transaction(
      async (tx) => {
        const wallet = await tx.wallet.upsert({
          where: { userId },
          create: { userId, coins: normalizedCoins, diamondsEarned: 0 },
          update: { coins: { increment: normalizedCoins } },
        });

        await tx.coinLot.create({
          data: {
            userId,
            sourceType: CoinLotSourceType.ADMIN_ADJUST,
            provider: PurchaseProvider.DEV,
            coinsPurchased: normalizedCoins,
            coinsRemaining: normalizedCoins,
            priceCents: 0,
            currency: 'USD',
            providerAvailableOn: new Date(),
            status: CoinLotStatus.AVAILABLE,
            metadataJson: {
              source: 'dev_credit_endpoint',
            },
          },
        });

        await tx.walletLedger.create({
          data: {
            userId,
            type: LedgerEntryType.PURCHASE_CREDIT,
            deltaCoins: normalizedCoins,
            deltaDiamonds: 0,
          },
        });

        return { success: true, newBalance: wallet.coins };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }

  async listCoinPackages(requesterUserId?: string) {
    const isAdmin = await this.isUserAdmin(requesterUserId);

    return this.prisma.coinPackage.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        ...(isAdmin ? {} : { forDevUse: false }),
      },
      orderBy: [{ sortOrder: 'asc' }, { coins: 'asc' }],
      select: {
        id: true,
        coins: true,
        priceCents: true,
        currency: true,
        isActive: true,
        forDevUse: true,
        badgeText: true,
        colorPreset: true,
        isFeatured: true,
        sortOrder: true,
        appleProductId: true,
        googleProductId: true,
      },
    });
  }

  async getOrder(userId: string, orderId: string) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id: orderId },
      include: {
        coinLots: true,
        pkg: true,
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException();

    return order;
  }

  async createOrder(userId: string, dto: { packageId: string; idempotencyKey?: string }) {
    return this.createOrderWithProvider(userId, dto, PurchaseProvider.DEV);
  }

  async createStripeOrder(userId: string, dto: { packageId: string; idempotencyKey?: string }) {
    const result = await this.createOrderWithProvider(userId, dto, PurchaseProvider.STRIPE);

    if (result.bypassedPayment || result.autoFulfilled) {
      return result;
    }

    const checkout = await this.createStripeCheckoutForOrder(result.order.id);

    return {
      ...result,
      ...checkout,
    };
  }

  private async createOrderWithProvider(
    userId: string,
    dto: { packageId: string; idempotencyKey?: string },
    provider: PurchaseProvider,
  ) {
    const pkg = await this.prisma.coinPackage.findUnique({ where: { id: dto.packageId } });

    if (!pkg || !pkg.isActive || pkg.deletedAt) {
      throw new NotFoundException('Coin package not found');
    }

    const isAdmin = await this.isUserAdmin(userId);

    if (pkg.forDevUse && !isAdmin) {
      throw new NotFoundException('Coin package not found');
    }

    if (pkg.priceCents < 0) {
      throw new BadRequestException('Coin package price cannot be negative');
    }

    if (pkg.priceCents === 0 && !pkg.forDevUse) {
      throw new BadRequestException('Zero-dollar packages must be marked for dev use');
    }

    const isFreeDevPackage = pkg.forDevUse && pkg.priceCents === 0;
    const effectiveProvider = isFreeDevPackage ? PurchaseProvider.DEV : provider;

    if (dto.idempotencyKey) {
      const existing = await this.prisma.purchaseOrder.findFirst({
        where: {
          userId,
          idempotencyKey: dto.idempotencyKey,
          provider: effectiveProvider,
        },
      });

      if (existing) {
        return {
          ok: true,
          order: existing,
          reused: true,
          bypassedPayment: isFreeDevPackage,
          autoFulfilled: existing.status === PurchaseStatus.FULFILLED,
        };
      }
    }

    if (isFreeDevPackage) {
      if (!isAdmin) {
        throw new ForbiddenException('Only admins can use dev-only free packages');
      }

      const providerRef = `free_dev:${dto.idempotencyKey || randomUUID()}`;

      const result = await this.systemUpsertPaidAndFulfill({
        userId,
        provider: PurchaseProvider.DEV,
        providerRef,
        packageId: pkg.id,
        idempotencyKey: dto.idempotencyKey ?? null,
        providerAvailableOn: new Date(),
        metadataJson: {
          source: 'free_dev_package',
        },
      });

      return {
        ...result,
        reused: false,
        bypassedPayment: true,
        autoFulfilled: true,
      };
    }

    const order = await this.prisma.purchaseOrder.create({
      data: {
        userId,
        packageId: pkg.id,
        provider: effectiveProvider,
        status: PurchaseStatus.PENDING,
        idempotencyKey: dto.idempotencyKey ?? null,
        providerRef: null,
        coins: pkg.coins,
        priceCents: pkg.priceCents,
        currency: pkg.currency,
      },
    });

    return { ok: true, order, reused: false, bypassedPayment: false, autoFulfilled: false };
  }

  async devMarkPaid(userId: string, orderId: string, providerRef?: string) {
    const order = await this.prisma.purchaseOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== userId) throw new ForbiddenException();

    if (order.status === PurchaseStatus.FULFILLED) return { ok: true, order, alreadyPaid: true };
    if (order.status !== PurchaseStatus.PENDING) throw new BadRequestException('Order not pending');
    if (order.provider !== PurchaseProvider.DEV) throw new BadRequestException('Not a DEV order');

    const updated = await this.prisma.purchaseOrder.update({
      where: { id: orderId },
      data: {
        status: PurchaseStatus.PAID,
        paidAt: new Date(),
        providerRef: providerRef ?? order.providerRef ?? `dev:${randomUUID()}`,
      },
    });

    return { ok: true, order: updated, alreadyPaid: false };
  }

  async fulfill(userId: string, orderId: string, providerRef?: string) {
    const result = await this.prisma.$transaction(
      async (tx) => {
        const order = await tx.purchaseOrder.findUnique({ where: { id: orderId } });
        if (!order) throw new NotFoundException('Order not found');
        if (order.userId !== userId) throw new ForbiddenException();

        if (order.status === PurchaseStatus.FULFILLED) {
          return { ok: true, order, alreadyFulfilled: true };
        }

        if (order.status !== PurchaseStatus.PAID) {
          throw new BadRequestException('Order must be PAID before fulfillment');
        }

        if (order.provider !== PurchaseProvider.DEV) {
          throw new BadRequestException('Not a DEV order');
        }

        return this.fulfillInternal(tx, orderId, {
          providerRef: providerRef ?? order.providerRef ?? `dev:${randomUUID()}`,
          providerAvailableOn: new Date(),
          metadataJson: {
            source: 'manual_dev_fulfill',
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    const shouldSendConfirmation =
      result.ok &&
      !("alreadyFulfilled" in result && result.alreadyFulfilled) &&
      !("ignored" in result && result.ignored);

    if (shouldSendConfirmation) {
      await this.sendPurchaseConfirmationSafely(result.order.id);
    }

    return result;
  }

  async systemMarkPaidAndFulfill(params: {
    orderId: string;
    provider: 'STRIPE';
    providerRef?: string | null;
    providerPaymentIntentId?: string | null;
    providerChargeId?: string | null;
    providerBalanceTransactionId?: string | null;
    providerAvailableOn?: Date | null;
    metadataJson?: Prisma.InputJsonValue;
  }) {
    const provider = PurchaseProvider.STRIPE;
    const providerRef = params.providerRef ?? null;

    const result = await this.prisma.$transaction(
      async (tx) => {
        const order = await tx.purchaseOrder.findUnique({ where: { id: params.orderId } });
        if (!order) throw new NotFoundException('Order not found');
        if (order.provider !== provider) throw new BadRequestException('Order provider mismatch');

        if (order.status === PurchaseStatus.FULFILLED) {
          return { ok: true, order, alreadyFulfilled: true };
        }

        if (order.status === PurchaseStatus.PENDING) {
          await tx.purchaseOrder.update({
            where: { id: params.orderId },
            data: {
              status: PurchaseStatus.PAID,
              paidAt: new Date(),
              providerRef: providerRef ?? order.providerRef ?? null,
            },
          });
        } else if (order.status !== PurchaseStatus.PAID) {
          return { ok: false, order, ignored: true, reason: `status=${order.status}` };
        }

        return this.fulfillInternal(tx, params.orderId, {
          providerRef: providerRef ?? order.providerRef ?? null,
          providerPaymentIntentId: params.providerPaymentIntentId ?? null,
          providerChargeId: params.providerChargeId ?? null,
          providerBalanceTransactionId: params.providerBalanceTransactionId ?? null,
          providerAvailableOn: params.providerAvailableOn ?? null,
          metadataJson: params.metadataJson,
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    const shouldSendConfirmation =
      result.ok &&
      !("alreadyFulfilled" in result && result.alreadyFulfilled) &&
      !("ignored" in result && result.ignored);

    if (shouldSendConfirmation) {
      await this.sendPurchaseConfirmationSafely(result.order.id);
    }

    return result;
  }

  async verifyAppleIapAndCredit(userId: string, dto: AppleIapVerifyDto) {
    const mode = (process.env.IAP_APPLE_VERIFY_MODE ?? 'STUB').toUpperCase();
    if (mode === 'DISABLED') throw new BadRequestException('Apple IAP verification disabled');

    if (mode === 'STUB') {
      const productId = (dto as any).productId as string | undefined;
      const transactionId = (dto as any).transactionId as string | undefined;

      if (!productId || !transactionId) {
        throw new BadRequestException('STUB requires productId and transactionId');
      }

      const pkg = await this.prisma.coinPackage.findFirst({
        where: {
          isActive: true,
          deletedAt: null,
          appleProductId: productId,
        },
      });

      if (!pkg) throw new NotFoundException('Coin package not found for apple productId');

      return this.systemUpsertPaidAndFulfill({
        userId,
        provider: PurchaseProvider.APPLE,
        providerRef: transactionId,
        packageId: pkg.id,
        providerAvailableOn: new Date(),
        metadataJson: {
          source: 'apple_iap_stub',
          productId,
          transactionId,
          appAccountToken: dto.appAccountToken ?? null,
          environment: dto.environment ?? null,
        },
      });
    }

    if (mode !== 'REAL') {
      throw new BadRequestException(`Unsupported IAP_APPLE_VERIFY_MODE=${mode}`);
    }

    const signedTransactionInfo = dto.signedTransactionInfo;
    if (!signedTransactionInfo) {
      throw new BadRequestException('REAL requires signedTransactionInfo');
    }

    let decoded: any;
    try {
      decoded = await this.getAppleVerifier().verifyAndDecodeTransaction(signedTransactionInfo);
    } catch {
      throw new BadRequestException('Invalid Apple signedTransactionInfo');
    }

    const transactionId = decoded?.transactionId;
    const productId = decoded?.productId;
    const bundleId = decoded?.bundleId;

    if (!transactionId) throw new BadRequestException('Apple transaction missing transactionId');
    if (!productId) throw new BadRequestException('Apple transaction missing productId');

    const expectedBundleId = process.env.APPLE_BUNDLE_ID;
    if (!expectedBundleId) throw new BadRequestException('APPLE_BUNDLE_ID is required in REAL mode');
    if (bundleId && bundleId !== expectedBundleId) {
      throw new BadRequestException('Apple bundleId mismatch');
    }

    const pkg = await this.prisma.coinPackage.findFirst({
      where: {
        isActive: true,
        deletedAt: null,
        appleProductId: productId,
      },
    });

    if (!pkg) throw new NotFoundException('Coin package not found for apple productId');

    return this.systemUpsertPaidAndFulfill({
      userId,
      provider: PurchaseProvider.APPLE,
      providerRef: transactionId,
      packageId: pkg.id,
      providerAvailableOn: new Date(),
      metadataJson: {
        source: 'apple_iap_real',
        transactionId,
        productId,
        bundleId: bundleId ?? null,
        appAccountToken: dto.appAccountToken ?? null,
        environment: dto.environment ?? null,
      },
    });
  }

  async verifyGoogleIapAndCredit(userId: string, dto: GoogleIapVerifyDto) {
    const mode = (process.env.IAP_GOOGLE_VERIFY_MODE ?? 'STUB').toUpperCase();
    if (mode === 'DISABLED') throw new BadRequestException('Google IAP verification disabled');

    if (mode === 'STUB') {
      if (!dto.productId) throw new BadRequestException('STUB requires productId');

      const pkg = await this.prisma.coinPackage.findFirst({
        where: {
          isActive: true,
          deletedAt: null,
          googleProductId: dto.productId,
        },
      });

      if (!pkg) throw new NotFoundException('Coin package not found for google productId');

      return this.systemUpsertPaidAndFulfill({
        userId,
        provider: PurchaseProvider.GOOGLE,
        providerRef: dto.purchaseToken,
        packageId: pkg.id,
        providerAvailableOn: new Date(),
        metadataJson: {
          source: 'google_iap_stub',
          productId: dto.productId,
          purchaseToken: dto.purchaseToken,
          packageName: dto.packageName ?? null,
        },
      });
    }

    if (mode !== 'REAL') {
      throw new BadRequestException(`Unsupported IAP_GOOGLE_VERIFY_MODE=${mode}`);
    }

    const productId = dto.productId;
    const packageName = dto.packageName;

    if (!productId) throw new BadRequestException('REAL requires productId');
    if (!packageName) throw new BadRequestException('REAL requires packageName');

    const expectedPackage = process.env.GOOGLE_PLAY_PACKAGE_NAME;
    if (expectedPackage && expectedPackage !== packageName) {
      throw new BadRequestException('Google packageName mismatch');
    }

    const purchase = await this.googleVerifyProductPurchase({
      packageName,
      productId,
      purchaseToken: dto.purchaseToken,
    });

    if (purchase.productId && purchase.productId !== productId) {
      throw new BadRequestException('Google productId mismatch');
    }

    if (purchase.purchaseState !== 0) {
      const state = purchase.purchaseState;
      throw new BadRequestException(`Google purchase not purchased (purchaseState=${state})`);
    }

    const pkg = await this.prisma.coinPackage.findFirst({
      where: {
        isActive: true,
        deletedAt: null,
        googleProductId: productId,
      },
    });

    if (!pkg) throw new NotFoundException('Coin package not found for google productId');

    return this.systemUpsertPaidAndFulfill({
      userId,
      provider: PurchaseProvider.GOOGLE,
      providerRef: dto.purchaseToken,
      packageId: pkg.id,
      providerAvailableOn: new Date(),
      metadataJson: {
        source: 'google_iap_real',
        productId,
        purchaseToken: dto.purchaseToken,
        packageName,
        googleOrderId: purchase.orderId ?? null,
        purchaseTimeMillis: purchase.purchaseTimeMillis ?? null,
        purchaseState: purchase.purchaseState ?? null,
        acknowledgementState: purchase.acknowledgementState ?? null,
        regionCode: purchase.regionCode ?? null,
      },
    });
  }

  private getAppleVerifier(): SignedDataVerifier {
    if (this.appleVerifier) return this.appleVerifier;

    const bundleId = process.env.APPLE_BUNDLE_ID;
    if (!bundleId) throw new BadRequestException('APPLE_BUNDLE_ID is required for Apple REAL verification');

    const envRaw = (process.env.APPLE_ENVIRONMENT ?? 'Sandbox').toLowerCase();
    const environment = envRaw.startsWith('prod') ? Environment.PRODUCTION : Environment.SANDBOX;

    const enableOnlineChecks = (process.env.APPLE_ENABLE_ONLINE_CHECKS ?? 'false').toLowerCase() === 'true';

    const certDir = process.env.APPLE_ROOT_CERTS_DIR ?? path.join(process.cwd(), 'certs', 'apple');

    let certFiles: string[] = [];
    try {
      certFiles = fs
        .readdirSync(certDir)
        .filter((f) => f.toLowerCase().endsWith('.cer') || f.toLowerCase().endsWith('.der'))
        .map((f) => path.join(certDir, f));
    } catch {
      certFiles = [];
    }

    if (certFiles.length === 0) {
      throw new BadRequestException(
        `No Apple root certificates found in ${certDir}. Run backend/scripts/phase13-3-2-download-apple-root-certs.ps1`,
      );
    }

    const roots = certFiles.map((p) => fs.readFileSync(p));
    const appAppleIdRaw = process.env.APPLE_APPLE_ID;
    const appAppleId = appAppleIdRaw ? Number(appAppleIdRaw) : undefined;

    this.appleVerifier = new SignedDataVerifier(roots, enableOnlineChecks, environment, bundleId, appAppleId);
    return this.appleVerifier;
  }

  private getGoogleJwt(): JWT {
    if (this.googleJwt) return this.googleJwt;

    const b64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;
    let email: string | undefined;
    let key: string | undefined;

    if (b64 && b64.trim().length > 0) {
      try {
        const json = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
        email = json.client_email;
        key = json.private_key;
      } catch {
        throw new BadRequestException('Invalid GOOGLE_SERVICE_ACCOUNT_JSON_BASE64');
      }
    } else {
      email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
    }

    if (!email || !key) {
      throw new BadRequestException(
        'Google REAL verification not configured (missing service account credentials)',
      );
    }

    const normalizedKey = key.includes('\n') ? key.replace(/\\n/g, '\n') : key;

    this.googleJwt = new JWT({
      email,
      key: normalizedKey,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    return this.googleJwt;
  }

  private async googleVerifyProductPurchase(params: {
    packageName: string;
    productId: string;
    purchaseToken: string;
  }): Promise<GoogleProductPurchase> {
    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(
      params.packageName,
    )}/purchases/products/${encodeURIComponent(params.productId)}/tokens/${encodeURIComponent(params.purchaseToken)}`;

    try {
      const client = this.getGoogleJwt();
      const res = await client.request<GoogleProductPurchase>({ url, method: 'GET' });
      return (res.data ?? {}) as GoogleProductPurchase;
    } catch (err: any) {
      const status = err?.response?.status;

      if (status === 400 || status === 404) {
        throw new BadRequestException('Invalid Google purchaseToken');
      }
      if (status === 401 || status === 403) {
        throw new BadRequestException('Google API access denied (check service account permissions)');
      }

      throw new BadRequestException('Google purchase verification failed');
    }
  }

  async systemUpsertPaidAndFulfill(params: {
    userId: string;
    provider: PurchaseProvider;
    providerRef: string;
    packageId: string;
    idempotencyKey?: string | null;
    providerPaymentIntentId?: string | null;
    providerChargeId?: string | null;
    providerBalanceTransactionId?: string | null;
    providerAvailableOn?: Date | null;
    metadataJson?: Prisma.InputJsonValue;
  }) {
    const result = await this.prisma.$transaction(
      async (tx) => {
        const existing = await tx.purchaseOrder.findFirst({
          where: { provider: params.provider, providerRef: params.providerRef },
        });

        if (existing) {
          if (existing.userId !== params.userId) {
            throw new ForbiddenException('Purchase belongs to another user');
          }

          if (existing.status === PurchaseStatus.FULFILLED) {
            return { ok: true, order: existing, alreadyFulfilled: true };
          }

          if (existing.status === PurchaseStatus.PENDING) {
            await tx.purchaseOrder.update({
              where: { id: existing.id },
              data: { status: PurchaseStatus.PAID, paidAt: new Date() },
            });
          }

          return this.fulfillInternal(tx, existing.id, {
            providerRef: params.providerRef,
            providerPaymentIntentId: params.providerPaymentIntentId ?? null,
            providerChargeId: params.providerChargeId ?? null,
            providerBalanceTransactionId: params.providerBalanceTransactionId ?? null,
            providerAvailableOn: params.providerAvailableOn ?? null,
            metadataJson: params.metadataJson,
          });
        }

        const pkg = await tx.coinPackage.findUnique({ where: { id: params.packageId } });
        if (!pkg || !pkg.isActive || pkg.deletedAt) {
          throw new NotFoundException('Coin package not found');
        }

        const created = await tx.purchaseOrder.create({
          data: {
            userId: params.userId,
            packageId: pkg.id,
            provider: params.provider,
            status: PurchaseStatus.PAID,
            paidAt: new Date(),
            providerRef: params.providerRef,
            idempotencyKey: params.idempotencyKey ?? null,
            coins: pkg.coins,
            priceCents: pkg.priceCents,
            currency: pkg.currency,
          },
        });

        return this.fulfillInternal(tx, created.id, {
          providerRef: params.providerRef,
          providerPaymentIntentId: params.providerPaymentIntentId ?? null,
          providerChargeId: params.providerChargeId ?? null,
          providerBalanceTransactionId: params.providerBalanceTransactionId ?? null,
          providerAvailableOn: params.providerAvailableOn ?? null,
          metadataJson: params.metadataJson,
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    const shouldSendConfirmation =
      result.ok &&
      !("alreadyFulfilled" in result && result.alreadyFulfilled) &&
      !("ignored" in result && result.ignored);

    if (shouldSendConfirmation) {
      await this.sendPurchaseConfirmationSafely(result.order.id);
    }

    return result;
  }

  private async fulfillInternal(
    tx: Prisma.TransactionClient,
    orderId: string,
    refs: FundingRefs,
  ) {
    const order = await tx.purchaseOrder.findUnique({
      where: { id: orderId },
      include: {
        coinLots: true,
        pkg: {
          select: {
            id: true,
            coins: true,
            priceCents: true,
            currency: true,
            badgeText: true,
            colorPreset: true,
            sortOrder: true,
          },
        },
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    if (order.status === PurchaseStatus.FULFILLED) {
      return { ok: true, order, alreadyFulfilled: true };
    }

    if (order.status !== PurchaseStatus.PAID) {
      throw new BadRequestException('Order must be PAID before fulfillment');
    }

    const userId: string = order.userId;

    const existingLot = await tx.coinLot.findUnique({
      where: {
        orderId: order.id,
      },
    });

    let wallet: any = null;

    if (!existingLot) {
      await tx.wallet.upsert({
        where: { userId },
        update: {},
        create: { userId, coins: 0, diamondsEarned: 0 },
      });

      await this.ensureProfileExists(tx, userId);

      await tx.coinLot.create({
        data: {
          userId,
          orderId: order.id,
          sourceType: CoinLotSourceType.PURCHASE,
          provider: order.provider,
          coinsPurchased: order.coins,
          coinsRemaining: order.coins,
          priceCents: order.priceCents,
          currency: order.currency || 'USD',
          providerPaymentIntentId: refs.providerPaymentIntentId ?? null,
          providerChargeId: refs.providerChargeId ?? null,
          providerBalanceTransactionId: refs.providerBalanceTransactionId ?? null,
          providerAvailableOn: refs.providerAvailableOn ?? new Date(),
          status: CoinLotStatus.AVAILABLE,
          metadataJson:
            refs.metadataJson === undefined
              ? {
                providerRef: refs.providerRef ?? order.providerRef ?? null,
              }
              : refs.metadataJson,
        },
      });

      wallet = await tx.wallet.update({
        where: { userId },
        data: { coins: { increment: order.coins } },
      });

      await tx.walletLedger.create({
        data: {
          userId,
          type: LedgerEntryType.PURCHASE_CREDIT,
          deltaCoins: order.coins,
          deltaDiamonds: 0,
        },
      });

      await this.applyVipPurchaseProgress(tx, userId, Number(order.priceCents || 0));
    } else {
      wallet = await tx.wallet.findUnique({ where: { userId } });
    }

    const updated = await tx.purchaseOrder.update({
      where: { id: orderId },
      data: {
        status: PurchaseStatus.FULFILLED,
        fulfilledAt: new Date(),
        providerRef: refs.providerRef ?? order.providerRef ?? null,
      },
      include: {
        coinLots: true,
        pkg: {
          select: {
            id: true,
            coins: true,
            priceCents: true,
            currency: true,
            badgeText: true,
            colorPreset: true,
            sortOrder: true,
          },
        },
      },
    });

    return { ok: true, order: updated, wallet, alreadyFulfilled: false };
  }

  async seedDefaultPackages() {
    const defaults = [
      {
        id: 'coins_1000',
        coins: 1000,
        priceCents: 199,
        currency: 'USD',
        sortOrder: 10,
        appleProductId: 'com.liveapp.coins_1000',
        googleProductId: 'coins_1000',
        badgeText: null,
        colorPreset: null,
        isFeatured: false,
      },
      {
        id: 'coins_5000',
        coins: 5000,
        priceCents: 799,
        currency: 'USD',
        sortOrder: 20,
        appleProductId: 'com.liveapp.coins_5000',
        googleProductId: 'coins_5000',
        badgeText: null,
        colorPreset: null,
        isFeatured: false,
      },
      {
        id: 'coins_20000',
        coins: 20000,
        priceCents: 2499,
        currency: 'USD',
        sortOrder: 30,
        appleProductId: 'com.liveapp.coins_20000',
        googleProductId: 'coins_20000',
        badgeText: null,
        colorPreset: null,
        isFeatured: false,
      },
    ];

    for (const p of defaults) {
      const existing = await this.prisma.coinPackage.findUnique({
        where: { id: p.id },
        select: {
          id: true,
          deletedAt: true,
        },
      });

      if (!existing) {
        await this.prisma.coinPackage.create({
          data: {
            ...p,
            isActive: true,
            forDevUse: false,
            deletedAt: null,
          },
        });
        continue;
      }

      if (existing.deletedAt) {
        continue;
      }

      await this.prisma.coinPackage.update({
        where: { id: p.id },
        data: {
          coins: p.coins,
          priceCents: p.priceCents,
          currency: p.currency,
          isActive: true,
          forDevUse: false,
          sortOrder: p.sortOrder,
          appleProductId: p.appleProductId,
          googleProductId: p.googleProductId,
          badgeText: p.badgeText,
          colorPreset: p.colorPreset,
          isFeatured: p.isFeatured,
        },
      });
    }
  }

  async reverseEarningsForRefundOrChargeback(params: {
    provider: 'STRIPE' | PurchaseProvider;
    providerChargeId?: string | null;
    providerPaymentIntentId?: string | null;
    reason: string;
    chargedBack?: boolean;
    metadataJson?: Prisma.InputJsonValue;
  }) {
    const provider =
      typeof params.provider === 'string'
        ? (params.provider as PurchaseProvider)
        : params.provider;

    const references = [
      params.providerChargeId
        ? { providerChargeId: params.providerChargeId }
        : undefined,
      params.providerPaymentIntentId
        ? { providerPaymentIntentId: params.providerPaymentIntentId }
        : undefined,
    ].filter(Boolean) as Prisma.CoinLotWhereInput[];

    if (references.length === 0) {
      return {
        lotsAffected: 0,
        earningsReversed: 0,
        paidEarningsNeedingDebt: 0,
        lockedEarningsNeedingReview: 0,
      };
    }

    return this.prisma.$transaction(
      async (tx) => {
        const lots = await tx.coinLot.findMany({
          where: {
            provider,
            OR: references,
          },
          include: {
            giftSources: {
              include: {
                earnings: true,
              },
            },
          },
        });

        if (lots.length === 0) {
          return {
            lotsAffected: 0,
            earningsReversed: 0,
            paidEarningsNeedingDebt: 0,
            lockedEarningsNeedingReview: 0,
          };
        }

        const lotIds = lots.map((lot) => lot.id);

        const lotUpdateData: Prisma.CoinLotUpdateManyMutationInput = {
          status: params.chargedBack
            ? CoinLotStatus.CHARGED_BACK
            : CoinLotStatus.REFUNDED,
        };

        if (params.metadataJson !== undefined) {
          lotUpdateData.metadataJson = params.metadataJson;
        }

        await tx.coinLot.updateMany({
          where: {
            id: {
              in: lotIds,
            },
          },
          data: lotUpdateData,
        });

        const reversibleEarningIds = lots.flatMap((lot) =>
          lot.giftSources.flatMap((source) =>
            source.earnings
              .filter(
                (earning) =>
                  earning.status === StreamerEarningStatus.PENDING ||
                  earning.status === StreamerEarningStatus.AVAILABLE,
              )
              .map((earning) => earning.id),
          ),
        );

        if (reversibleEarningIds.length > 0) {
          await tx.streamerEarning.updateMany({
            where: {
              id: {
                in: reversibleEarningIds,
              },
            },
            data: {
              status: StreamerEarningStatus.REVERSED,
              reversalReason: params.reason,
              reversedAt: new Date(),
            },
          });
        }

        const lockedEarnings = lots.flatMap((lot) =>
          lot.giftSources.flatMap((source) =>
            source.earnings.filter(
              (earning) => earning.status === StreamerEarningStatus.LOCKED,
            ),
          ),
        );

        const paidEarnings = lots.flatMap((lot) =>
          lot.giftSources.flatMap((source) =>
            source.earnings.filter(
              (earning) => earning.status === StreamerEarningStatus.PAID,
            ),
          ),
        );

        return {
          lotsAffected: lotIds.length,
          earningsReversed: reversibleEarningIds.length,
          paidEarningsNeedingDebt: paidEarnings.length,
          lockedEarningsNeedingReview: lockedEarnings.length,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  }
}