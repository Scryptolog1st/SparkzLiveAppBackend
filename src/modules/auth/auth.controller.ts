import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { SignupDto } from "./dto/signup.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { LogoutDto } from "./dto/logout.dto";
import {
  AuthIdentifierDto,
  AuthTokenDto,
  PasswordResetConfirmDto,
} from "../../common/dto/user.dto";

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) { }

  @Post("/auth/signup")
  async signup(@Body() dto: SignupDto) {
    return this.auth.signup(dto);
  }

  @HttpCode(200)
  @Post("/auth/login")
  async login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @HttpCode(200)
  @Post("/auth/refresh")
  async refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @HttpCode(200)
  @Post("/auth/logout")
  async logout(@Body() dto: LogoutDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @HttpCode(200)
  @Post("/auth/login/2fa")
  async login2FA(@Body() dto: { userId: string; token: string }) {
    return this.auth.login2FA(dto);
  }

  @HttpCode(200)
  @Post("/auth/verify-email/resend")
  async resendVerifyEmail(@Body() dto: AuthIdentifierDto) {
    return this.auth.resendVerifyEmail(dto.emailOrUsername);
  }

  @HttpCode(200)
  @Post("/auth/verify-email/confirm")
  async confirmVerifyEmail(@Body() dto: AuthTokenDto) {
    return this.auth.confirmEmailVerification(dto.token);
  }

  @HttpCode(200)
  @Post("/auth/password-reset/request")
  async requestPasswordReset(@Body() dto: AuthIdentifierDto) {
    return this.auth.requestPasswordReset(dto.emailOrUsername);
  }

  @HttpCode(200)
  @Post("/auth/password-reset/confirm")
  async confirmPasswordReset(@Body() dto: PasswordResetConfirmDto) {
    return this.auth.confirmPasswordReset(dto.token, dto.newPassword);
  }
}