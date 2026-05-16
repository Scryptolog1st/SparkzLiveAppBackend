import { IsIn, IsString, IsUUID } from "class-validator";

import { STREAM_STAFF_ROLES } from "../stream-staff.constants";

export class AssignStreamStaffRoleDto {
  @IsUUID()
  targetUserId!: string;

  @IsString()
  @IsIn(STREAM_STAFF_ROLES)
  role!: (typeof STREAM_STAFF_ROLES)[number];
}
