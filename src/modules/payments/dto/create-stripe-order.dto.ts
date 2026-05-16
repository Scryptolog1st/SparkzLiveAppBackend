import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateStripeOrderDto {
  @IsString()
  @MaxLength(120)
  packageId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  idempotencyKey?: string;
}