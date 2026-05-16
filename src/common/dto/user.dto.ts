import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export class UpdateEmailDto {
  @IsEmail({}, { message: "Please enter a valid email address" })
  @IsNotEmpty()
  email!: string;
}

export class UpdatePasswordDto {
  @IsNotEmpty()
  @IsString()
  currentPassword!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: "New password must be at least 8 characters long" })
  newPassword!: string;
}

export class AuthIdentifierDto {
  @IsString()
  @IsNotEmpty()
  emailOrUsername!: string;
}

export class AuthTokenDto {
  @IsString()
  @IsNotEmpty()
  token!: string;
}

export class PasswordResetConfirmDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: "New password must be at least 8 characters long" })
  newPassword!: string;
}

export type UserDto = {
  id: string;
  publicId: string;
  email: string;
  username: string;
  emailUpdatedAt?: string | null;
  lastUsernameChange?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UserSummaryDto = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  level?: number | null;
};

export type NotificationPreferencesDto = {
  pushEnabled: boolean;
  liveAlertsEnabled: boolean;
  marketingEmailsEnabled: boolean;
};

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  liveAlertsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  marketingEmailsEnabled?: boolean;
}

export class TwoFactorVerifyDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  token!: string;
}