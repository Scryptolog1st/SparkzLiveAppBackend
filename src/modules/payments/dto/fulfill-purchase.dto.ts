import { IsOptional, IsString, MaxLength } from 'class-validator';

export class FulfillPurchaseDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  providerRef?: string;
}