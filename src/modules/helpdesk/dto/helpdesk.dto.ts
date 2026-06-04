import {
    IsBoolean,
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    Min,
} from "class-validator";

export class HelpdeskTicketQueryDto {
    @IsOptional()
    @IsIn(["OPEN", "PENDING_ADMIN", "PENDING_USER", "ESCALATED", "RESOLVED", "CLOSED"])
    status?: string;

    @IsOptional()
    @IsIn(["LOW", "NORMAL", "HIGH", "URGENT"])
    priority?: string;

    @IsOptional()
    @IsUUID()
    categoryId?: string;

    @IsOptional()
    @IsIn(["any", "assigned", "unassigned"])
    assignment?: string;

    @IsOptional()
    @IsString()
    @MaxLength(120)
    search?: string;

    @IsOptional()
    @IsString()
    page?: string;

    @IsOptional()
    @IsString()
    pageSize?: string;
}

export class CreateHelpdeskTicketDto {
    @IsOptional()
    @IsUUID()
    categoryId?: string;

    @IsString()
    @MaxLength(160)
    subject!: string;

    @IsString()
    @MaxLength(5000)
    body!: string;
}

export class ReplyHelpdeskTicketDto {
    @IsString()
    @MaxLength(5000)
    body!: string;
}

export class AddHelpdeskInternalNoteDto {
    @IsString()
    @MaxLength(5000)
    body!: string;
}

export class AssignHelpdeskTicketDto {
    @IsOptional()
    @IsUUID()
    assignedAdminUserId?: string;
}

export class UpdateHelpdeskTicketStatusDto {
    @IsIn(["OPEN", "PENDING_ADMIN", "PENDING_USER", "ESCALATED", "RESOLVED", "CLOSED"])
    status!: string;
}

export class UpdateHelpdeskTicketPriorityDto {
    @IsIn(["LOW", "NORMAL", "HIGH", "URGENT"])
    priority!: string;
}

export class UpdateHelpdeskTicketCategoryDto {
    @IsOptional()
    @IsUUID()
    categoryId?: string;
}

export class UpsertHelpdeskCategoryDto {
    @IsString()
    @MaxLength(80)
    key!: string;

    @IsString()
    @MaxLength(120)
    name!: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @IsOptional()
    @IsInt()
    @Min(0)
    sortOrder?: number;
}
