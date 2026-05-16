import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { PayoutsService } from './payouts.service';

type JwtReq = Request & { user?: { userId: string } };

type RequestPayoutBody = {
  amount?: number;
  diamondAmount?: number;
  requestedAmountCents?: number;
  payoutMethodId?: string | null;
  provider?: 'MANUAL' | 'STRIPE' | 'PAYPAL';
  idempotencyKey?: string;
  paymentMethod?: string;
  paymentDetails?: unknown;
};

@UseGuards(JwtAuthGuard)
@Controller()
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) { }

  @Get('/me/payouts')
  async getHistory(@Req() req: JwtReq) {
    return this.payoutsService.getHistory(req.user!.userId);
  }

  @Get('/me/payouts/summary')
  async getSummary(@Req() req: JwtReq) {
    return this.payoutsService.getCreatorEarningsSummary(req.user!.userId);
  }

  @Post('/me/payouts/request')
  async requestPayout(
    @Req() req: JwtReq,
    @Body() body: RequestPayoutBody,
  ) {
    return this.payoutsService.requestPayout(req.user!.userId, {
      diamondAmount: body.diamondAmount ?? body.amount,
      requestedAmountCents: body.requestedAmountCents,
      payoutMethodId: body.payoutMethodId ?? null,
      provider: body.provider ?? 'MANUAL',
      idempotencyKey: body.idempotencyKey,
      paymentMethod: body.paymentMethod,
      paymentDetails: body.paymentDetails,
    });
  }
}