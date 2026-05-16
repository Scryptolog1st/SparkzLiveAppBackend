import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  type!: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  body?: string;

  // Allow JSON payload objects.
  // NOTE: Your ValidationPipe appears to use `forbidNonWhitelisted=true`,
  // so properties must have decorators or they'll be rejected.
  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;

  @IsOptional()
  @IsString()
  streamId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  dedupeKey?: string;
}
