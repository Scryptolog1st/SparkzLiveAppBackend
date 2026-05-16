import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { PaymentsService } from './payments.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { CreateStripeOrderDto } from './dto/create-stripe-order.dto';
import { FulfillPurchaseDto } from './dto/fulfill-purchase.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) { }

  private async ensureSeeded() {
    await this.payments.seedDefaultPackages();
  }

  @Get('coin-packages')
  async listPublicPackages() {
    await this.ensureSeeded();
    return this.payments.listCoinPackages();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('coin-packages/me')
  async listPackagesForSignedInUser(@Req() req: any) {
    await this.ensureSeeded();
    return this.payments.listCoinPackages(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('orders')
  async createOrder(@Req() req: any, @Body() dto: CreatePurchaseOrderDto) {
    await this.ensureSeeded();
    return this.payments.createOrder(req.user.userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('orders/stripe')
  async createStripeOrder(@Req() req: any, @Body() dto: CreateStripeOrderDto) {
    await this.ensureSeeded();
    return this.payments.createStripeOrder(req.user.userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('stripe/checkout-session/:sessionId')
  async getStripeCheckoutSession(@Req() req: any, @Param('sessionId') sessionId: string) {
    return this.payments.getStripeCheckoutSession(req.user.userId, sessionId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('orders/:id')
  async getOrder(@Req() req: any, @Param('id') id: string) {
    return this.payments.getOrder(req.user.userId, id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('orders/:id/dev/mark-paid')
  async devMarkPaid(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: FulfillPurchaseDto,
  ) {
    return this.payments.devMarkPaid(req.user.userId, id, dto.providerRef);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('orders/:id/fulfill')
  async fulfill(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: FulfillPurchaseDto,
  ) {
    return this.payments.fulfill(req.user.userId, id, dto.providerRef);
  }

  @Post('dev/credit')
  @UseGuards(AuthGuard('jwt'))
  async addDevCredit(
    @Req() req: any,
    @Body() body: { packageId?: string; coins: number },
  ) {
    if (!body.coins) {
      throw new BadRequestException('Amount of coins is required');
    }

    return this.payments.addDevCoins(req.user.userId, Number(body.coins));
  }
}