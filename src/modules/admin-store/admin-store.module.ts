import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminStoreController } from './admin-store.controller';
import { AdminStoreService } from './admin-store.service';

@Module({
    imports: [PrismaModule],
    controllers: [AdminStoreController],
    providers: [AdminStoreService],
    exports: [AdminStoreService],
})
export class AdminStoreModule { }