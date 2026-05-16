import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { PaymentsService } from '../payments.service';
import { AppleIapVerifyDto } from '../dto/apple-iap-verify.dto';
import { GoogleIapVerifyDto } from '../dto/google-iap-verify.dto';

@Controller('payments/iap')
export class IapController {
  constructor(private readonly payments: PaymentsService) { }

  @UseGuards(AuthGuard('jwt'))
  @Post('apple/verify')
  async verifyApple(@Req() req: any, @Body() dto: AppleIapVerifyDto) {
    return this.payments.verifyAppleIapAndCredit(req.user.userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('google/verify')
  async verifyGoogle(@Req() req: any, @Body() dto: GoogleIapVerifyDto) {
    return this.payments.verifyGoogleIapAndCredit(req.user.userId, dto);
  }
}