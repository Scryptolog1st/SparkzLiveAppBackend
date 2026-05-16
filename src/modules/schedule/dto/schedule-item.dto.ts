import {
  IsBoolean,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { validationLimits } from "../../../config/validation-limits";

export class ScheduleItemInputDto {
  @IsBoolean()
  isRecurring!: boolean;

  @IsString({ message: "Schedule title must be text." })
  @MaxLength(validationLimits.scheduleTitleMax, {
    message: `Schedule title must be ${validationLimits.scheduleTitleMax} characters or fewer.`,
  })
  title!: string;

  @IsOptional()
  @IsString({ message: "Schedule description must be text." })
  @MaxLength(validationLimits.scheduleDescriptionMax, {
    message: `Schedule description must be ${validationLimits.scheduleDescriptionMax} characters or fewer.`,
  })
  description?: string;

  @IsString({ message: "Schedule timezone must be text." })
  @MaxLength(validationLimits.scheduleTimezoneMax, {
    message: `Schedule timezone must be ${validationLimits.scheduleTimezoneMax} characters or fewer.`,
  })
  timezone!: string;

  @IsOptional()
  @IsInt({ message: "dayOfWeek must be a number." })
  @Min(0, { message: "dayOfWeek must be between 0 and 6." })
  @Max(6, { message: "dayOfWeek must be between 0 and 6." })
  dayOfWeek?: number;

  @IsOptional()
  @IsString({ message: "time24h must be text." })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: "time24h must be in HH:MM 24-hour format.",
  })
  time24h?: string;

  @IsOptional()
  @IsISO8601({ strict: true }, { message: "startAt must be a valid ISO date/time." })
  startAt?: string;

  @IsOptional()
  @IsISO8601({ strict: true }, { message: "endAt must be a valid ISO date/time." })
  endAt?: string;
}