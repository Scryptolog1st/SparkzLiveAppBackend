import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { validationLimits } from "../../../config/validation-limits";

export class WifwEntryUpdateDto {
  @IsOptional()
  @IsString({ message: "WIFW user ID must be text." })
  id?: string | null;

  @IsString({ message: "WIFW username must be text." })
  @MaxLength(validationLimits.wifwUsernameMax, {
    message: `WIFW username must be ${validationLimits.wifwUsernameMax} characters or fewer.`,
  })
  username!: string;
}

export class UpdateMyProfileDto {
  @IsOptional()
  @IsString({ message: "Display name must be text." })
  @MaxLength(validationLimits.displayNameMax, {
    message: `Display name must be ${validationLimits.displayNameMax} characters or fewer.`,
  })
  displayName?: string;

  @IsOptional()
  @IsString({ message: "About Me must be text." })
  @MaxLength(validationLimits.bioMax, {
    message: `About Me must be ${validationLimits.bioMax} characters or fewer.`,
  })
  bio?: string;

  @IsOptional()
  @IsString({ message: "About must be text." })
  @MaxLength(validationLimits.bioMax, {
    message: `About must be ${validationLimits.bioMax} characters or fewer.`,
  })
  about?: string;

  @IsOptional()
  @IsArray({ message: "WIFW must be an array." })
  @ValidateNested({ each: true })
  @Type(() => WifwEntryUpdateDto)
  wifw?: WifwEntryUpdateDto[];

  @IsOptional()
  @IsString({ message: "Avatar URL must be text." })
  avatarUrl?: string;

  @IsOptional()
  @IsString({ message: "Banner URL must be text." })
  bannerUrl?: string;

  @IsOptional()
  @IsObject({ message: "linksJson must be an object." })
  linksJson?: Record<string, any>;

  @IsOptional()
  @IsString({ message: "Location must be text." })
  @MaxLength(validationLimits.locationMax, {
    message: `Location must be ${validationLimits.locationMax} characters or fewer.`,
  })
  location?: string;

  @IsOptional()
  @IsString({ message: "Birthdate must be text." })
  @MaxLength(validationLimits.birthdateMax, {
    message: `Birthdate must be ${validationLimits.birthdateMax} characters or fewer.`,
  })
  birthdate?: string;

  @IsOptional()
  @IsString({ message: "Website must be text." })
  @MaxLength(validationLimits.websiteMax, {
    message: `Website must be ${validationLimits.websiteMax} characters or fewer.`,
  })
  website?: string;

  @IsOptional()
  @IsString({ message: "Instagram must be text." })
  @MaxLength(validationLimits.instagramMax, {
    message: `Instagram must be ${validationLimits.instagramMax} characters or fewer.`,
  })
  instagram?: string;

  @IsOptional()
  @IsString({ message: "YouTube must be text." })
  @MaxLength(validationLimits.youtubeMax, {
    message: `YouTube must be ${validationLimits.youtubeMax} characters or fewer.`,
  })
  youtube?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: "showBadgeOnProfile must be true or false." })
  showBadgeOnProfile?: boolean;

  @IsOptional()
  @IsArray({ message: "streamSchedule must be an array." })
  @IsObject({ each: true, message: "Each stream schedule item must be an object." })
  streamSchedule?: Record<string, any>[];
}