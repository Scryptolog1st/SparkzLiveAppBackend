import {
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class AppleIapVerifyDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  productId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  transactionId?: string;

  @IsOptional()
  @IsString()
  signedTransactionInfo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  appAccountToken?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  environment?: string;
}