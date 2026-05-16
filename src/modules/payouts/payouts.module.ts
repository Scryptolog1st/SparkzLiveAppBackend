import { Module } from '@nestjs/common';

import { EmailModule } from '../email/email.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PayoutsController } from './payouts.controller';
import { PayoutsService } from './payouts.service';

@Module({
    imports: [PrismaModule, EmailModule],
    controllers: [PayoutsController],
    providers: [PayoutsService],
    exports: [PayoutsService],
})
export class PayoutsModule { }