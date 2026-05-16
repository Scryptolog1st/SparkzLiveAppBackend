import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";

import { UsersService } from "../../users/users.service";

type Payload = { sub: string; username: string };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>("JWT_ACCESS_SECRET"),
    });
  }

  private buildBanExceptionPayload(user: any) {
    const reason =
      typeof user?.platformBanReason === "string"
        ? user.platformBanReason
        : null;

    return {
      message: reason ? `Account banned: ${reason}` : "Account banned.",
      code: "ACCOUNT_BANNED",
      ban: {
        userId: user?.id ?? null,
        reason,
        issuedAt:
          user?.platformBanIssuedAt instanceof Date
            ? user.platformBanIssuedAt.toISOString()
            : null,
        expiresAt:
          user?.platformBanExpiresAt instanceof Date
            ? user.platformBanExpiresAt.toISOString()
            : null,
      },
    };
  }

  private buildEmailNotVerifiedPayload(user: any) {
    return {
      message: "Please verify your email address before using the app.",
      code: "EMAIL_NOT_VERIFIED",
      email: user?.email ?? null,
      userId: user?.id ?? null,
      emailVerifiedAt:
        user?.emailVerifiedAt instanceof Date
          ? user.emailVerifiedAt.toISOString()
          : null,
    };
  }

  async validate(payload: Payload) {
    const user = await this.users.findByIdWithProfile(payload.sub);

    if (!user) {
      throw new UnauthorizedException();
    }

    const expiresAt = (user as any)?.platformBanExpiresAt;
    const platformBanActive =
      Boolean((user as any)?.isPlatformBanned) &&
      (!(expiresAt instanceof Date) || expiresAt.getTime() > Date.now());

    if (platformBanActive) {
      throw new ForbiddenException(this.buildBanExceptionPayload(user));
    }

    if (!user.emailVerifiedAt) {
      throw new ForbiddenException(this.buildEmailNotVerifiedPayload(user));
    }

    return {
      userId: user.id,
      username: user.username,
    };
  }
}