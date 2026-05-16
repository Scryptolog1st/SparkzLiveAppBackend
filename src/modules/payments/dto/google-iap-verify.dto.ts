import {
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class GoogleIapVerifyDto {
  @IsString()
  @MaxLength(255)
  productId!: string;

  @IsString()
  @MaxLength(1000)
  purchaseToken!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  packageName?: string;
}