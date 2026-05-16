import { IsIn, IsString, IsUUID } from "class-validator";

const AssignableRoles = ["GUEST", "MODERATOR", "VIEWER"] as const;
export type AssignableRole = (typeof AssignableRoles)[number];

export class AssignRoleDto {
  @IsUUID()
  targetUserId!: string;

  @IsString()
  @IsIn(AssignableRoles)
  role!: AssignableRole;
}
