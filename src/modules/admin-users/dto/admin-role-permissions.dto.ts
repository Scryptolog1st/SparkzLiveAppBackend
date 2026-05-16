import { ArrayMaxSize, IsArray, IsString } from "class-validator";

export class UpdateAdminRolePermissionsDto {
    @IsArray()
    @ArrayMaxSize(100)
    @IsString({ each: true })
    permissions!: string[];
}