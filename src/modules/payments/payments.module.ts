import { Module } from '@nestjs/common';

import { EmailModule } from '../email/email.module';
import { PrismaModule } from '../prisma/prisma.module';
import { IapController } from './iap/iap.controller';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StripeWebhooksController } from './stripe/stripe-webhooks.controller';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [PaymentsController, StripeWebhooksController, IapController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule { }