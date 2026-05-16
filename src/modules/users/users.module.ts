import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { UsersService } from "./users.service";
import { MeController } from "./me.controller";
import { TwoFactorService } from "../auth/2fa.service";
import { PrismaModule } from "../prisma/prisma.module";
import { EmailModule } from "../email/email.module";
import { RealtimeModule } from "../realtime/realtime.module";

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    EmailModule,
    forwardRef(() => RealtimeModule),
  ],
  providers: [UsersService, TwoFactorService],
  controllers: [MeController],
  exports: [UsersService, TwoFactorService],
})
export class UsersModule { }