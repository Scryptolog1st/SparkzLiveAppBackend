import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

const AdminBanAppealStatuses = [
  "PENDING",
  "IN_REVIEW",
  "APPROVED",
  "DENIED",
  "all",
] as const;

const AdminBanAppealSorts = ["newest", "oldest", "updated"] as const;
const ApprovalActions = ["unban_now", "leave_ban"] as const;

export class SubmitBanAppealDto {
  @IsString()
  emailOrUsername!: string;

  @IsString()
  password!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  appealMessage!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  contactNote?: string;
}

export class AdminBanAppealsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  @IsIn(AdminBanAppealStatuses)
  status?: (typeof AdminBanAppealStatuses)[number];

  @IsOptional()
  @IsString()
  @IsIn(AdminBanAppealSorts)
  sort?: (typeof AdminBanAppealSorts)[number];
}

export class AdminBanAppealNoteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  adminNotes!: string;
}

export class AdminBanAppealInReviewDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNotes?: string;
}

export class AdminBanAppealDecisionDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  decisionNotes?: string;

  @IsOptional()
  @IsString()
  @IsIn(ApprovalActions)
  approvalAction?: (typeof ApprovalActions)[number];
}