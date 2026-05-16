import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class AdminStoreTransactionsQueryDto {
    @IsOptional()
    @IsString()
    @MaxLength(120)
    search?: string;

    @IsOptional()
    @IsIn(["PENDING", "PAID", "FULFILLED", "FAILED", "CANCELED"])
    status?: string;

    @IsOptional()
    @IsString()
    page?: string;

    @IsOptional()
    @IsString()
    pageSize?: string;
}

export class AdminStoreUsersQueryDto {
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