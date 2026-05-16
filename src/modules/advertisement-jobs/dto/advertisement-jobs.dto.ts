import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { Type } from "class-transformer";

export class DeclineAdvertisementJobCompletionDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RateAdvertisementJobDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  stars!: number;
}
