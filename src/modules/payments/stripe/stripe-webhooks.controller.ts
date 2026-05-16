import { BadRequestException, Controller, Headers, Post, Req } from '@nestjs/common';
const Stripe = require('stripe');

import { PaymentsService } from '../payments.service';
import { verifyStripeSignature } from './stripe-signature.util';

type StripeFundingRefs = {
  providerPaymentIntentId?: string | null;
  providerChargeId?: string | null;
  providerBalanceTransactionId?: string | null;
  providerAvailableOn?: Date | null;
  metadataJson?: Record<string, unknown>;
};

@Controller('payments/webhooks')
export class StripeWebhooksController {
  private stripeClient?: any;

  constructor(private readonly payments: PaymentsService) { }

  private getStripeClient() {
    const secretKey = String(process.env.STRIPE_SECRET_KEY || '').trim();

    if (!secretKey) {
      throw new BadRequestException('STRIPE_SECRET_KEY is not configured.');
    }

    if (!this.stripeClient) {
      this.stripeClient = new Stripe(secretKey);
    }

    return this.stripeClient;
  }

  private unixSecondsToDate(value: unknown): Date | null {
    const seconds = Number(value);

    if (!Number.isFinite(seconds) || seconds <= 0) {
      return null;
    }

    return new Date(seconds * 1000);
  }

  private async resolveStripeFundingRefsFromCheckoutSession(
    session: any,
  ): Promise<StripeFundingRefs> {
    const stripe = this.getStripeClient();

    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    let providerPaymentIntentId = paymentIntentId;
    let providerChargeId: string | null = null;
    let providerBalanceTransactionId: string | null = null;
    let providerAvailableOn: Date | null = null;

    let metadataJson: Record<string, unknown> = {
      checkoutSessionId: session.id,
      paymentStatus: session.payment_status,
      mode: session.mode,
      amountTotal: session.amount_total ?? null,
      currency: session.currency ?? null,
    };

    if (!paymentIntentId) {
      return {
        providerPaymentIntentId,
        providerChargeId,
        providerBalanceTransactionId,
        providerAvailableOn,
        metadataJson,
      };
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['latest_charge.balance_transaction', 'charges.data.balance_transaction'],
    });

    providerPaymentIntentId = paymentIntent.id;

    const latestCharge =
      typeof paymentIntent.latest_charge === 'object' && paymentIntent.latest_charge
        ? paymentIntent.latest_charge
        : Array.isArray(paymentIntent.charges?.data) && paymentIntent.charges.data.length > 0
          ? paymentIntent.charges.data[0]
          : null;

    if (!latestCharge) {
      return {
        providerPaymentIntentId,
        providerChargeId,
        providerBalanceTransactionId,
        providerAvailableOn,
        metadataJson: {
          ...metadataJson,
          paymentIntentId: paymentIntent.id,
        },
      };
    }

    providerChargeId = latestCharge.id ?? null;

    const balanceTransaction =
      typeof latestCharge.balance_transaction === 'object' &&
        latestCharge.balance_transaction
        ? latestCharge.balance_transaction
        : latestCharge.balance_transaction
          ? await stripe.balanceTransactions.retrieve(latestCharge.balance_transaction)
          : null;

    if (balanceTransaction) {
      providerBalanceTransactionId = balanceTransaction.id ?? null;
      providerAvailableOn = this.unixSecondsToDate(balanceTransaction.available_on);

      metadataJson = {
        ...metadataJson,
        paymentIntentId: paymentIntent.id,
        chargeId: latestCharge.id ?? null,
        balanceTransactionId: balanceTransaction.id ?? null,
        balanceTransactionAvailableOn: balanceTransaction.available_on ?? null,
        balanceTransactionStatus: balanceTransaction.status ?? null,
        balanceTransactionType: balanceTransaction.type ?? null,
        balanceTransactionNet: balanceTransaction.net ?? null,
        balanceTransactionFee: balanceTransaction.fee ?? null,
      };
    }

    return {
      providerPaymentIntentId,
      providerChargeId,
      providerBalanceTransactionId,
      providerAvailableOn,
      metadataJson,
    };
  }

  private async handleCheckoutPaid(event: any) {
    const session = event.data.object as any;

    if (session.payment_status !== 'paid') {
      return {
        received: true,
        ignored: true,
        reason: `payment_status=${session.payment_status}`,
        type: event.type,
      };
    }

    const orderId = String(
      session.metadata?.orderId ||
      session.metadata?.purchaseOrderId ||
      session.client_reference_id ||
      '',
    ).trim();

    if (!orderId) {
      return {
        received: true,
        ignored: true,
        reason: 'missing orderId metadata',
        type: event.type,
      };
    }

    const fundingRefs = await this.resolveStripeFundingRefsFromCheckoutSession(session);

    const result = await this.payments.systemMarkPaidAndFulfill({
      orderId,
      provider: 'STRIPE',
      providerRef: session.id,
      providerPaymentIntentId: fundingRefs.providerPaymentIntentId,
      providerChargeId: fundingRefs.providerChargeId,
      providerBalanceTransactionId: fundingRefs.providerBalanceTransactionId,
      providerAvailableOn: fundingRefs.providerAvailableOn,
      metadataJson: {
        ...fundingRefs.metadataJson,
        stripeEventId: event.id,
        stripeEventType: event.type,
      },
    });

    return {
      received: true,
      ok: true,
      type: event.type,
      result,
    };
  }

  private async handleRefundOrChargeback(event: any) {
    const object = event.data.object as any;

    const providerChargeId = String(
      object.charge ||
      object.charge_id ||
      object.id ||
      '',
    ).trim();

    const providerPaymentIntentId = String(
      object.payment_intent ||
      object.paymentIntent ||
      '',
    ).trim();

    if (!providerChargeId && !providerPaymentIntentId) {
      return {
        received: true,
        ignored: true,
        type: event.type,
        reason: 'missing charge/payment intent reference',
      };
    }

    const chargedBack =
      event.type.startsWith('charge.dispute') ||
      event.type === 'charge.dispute.created' ||
      event.type === 'charge.dispute.closed' ||
      event.type === 'charge.dispute.funds_withdrawn';

    const result = await this.payments.reverseEarningsForRefundOrChargeback({
      provider: 'STRIPE',
      providerChargeId: providerChargeId || null,
      providerPaymentIntentId: providerPaymentIntentId || null,
      reason: chargedBack
        ? `Stripe dispute/chargeback event: ${event.type}`
        : `Stripe refund event: ${event.type}`,
      chargedBack,
      metadataJson: {
        stripeEventId: event.id,
        stripeEventType: event.type,
        objectId: object.id ?? null,
        objectStatus: object.status ?? null,
        amount: object.amount ?? null,
        currency: object.currency ?? null,
      },
    });

    return {
      received: true,
      ok: true,
      type: event.type,
      result,
    };
  }

  @Post('stripe')
  async stripeWebhook(@Req() req: any, @Headers('stripe-signature') signatureHeader: string) {
    const webhookSecret = String(process.env.STRIPE_WEBHOOK_SECRET || '').trim();

    if (!webhookSecret || webhookSecret === 'whsec_dev') {
      throw new BadRequestException('STRIPE_WEBHOOK_SECRET is not configured.');
    }

    const rawBody: Buffer | undefined = req.rawBody;

    verifyStripeSignature({
      secret: webhookSecret,
      rawBody,
      header: signatureHeader,
    });

    let event: any;

    try {
      event = JSON.parse(rawBody!.toString('utf8'));
    } catch {
      throw new BadRequestException('Invalid Stripe webhook JSON body.');
    }

    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        return this.handleCheckoutPaid(event);

      case 'charge.refunded':
      case 'refund.created':
      case 'refund.updated':
      case 'charge.dispute.created':
      case 'charge.dispute.closed':
      case 'charge.dispute.funds_withdrawn':
        return this.handleRefundOrChargeback(event);

      default:
        return {
          received: true,
          ignored: true,
          type: event.type,
        };
    }
  }
}