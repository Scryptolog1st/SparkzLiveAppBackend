import { Module, forwardRef } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";

import { ApiObservabilityModule } from "../api-observability/api-observability.module";
import { UsersModule } from "../users/users.module";
import { RealtimeGateway } from "./realtime.gateway";
import { PresenceService } from "./presence.service";

@Module({
  imports: [
    ApiObservabilityModule,
    forwardRef(() => UsersModule),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("JWT_ACCESS_SECRET"),
      }),
    }),
  ],
  providers: [PresenceService, RealtimeGateway],
  exports: [RealtimeGateway, PresenceService],
})
export class RealtimeModule { }