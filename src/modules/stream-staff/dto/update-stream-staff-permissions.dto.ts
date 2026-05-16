import { Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  ValidateNested,
} from "class-validator";

import {
  STREAM_PERMISSION_KEYS,
  STREAM_STAFF_ROLES,
} from "../stream-staff.constants";

export class StreamPermissionToggleDto {
  @IsIn(STREAM_PERMISSION_KEYS)
  permission!: (typeof STREAM_PERMISSION_KEYS)[number];

  @IsBoolean()
  enabled!: boolean;
}

export class StreamRolePermissionsEntryDto {
  @IsIn(STREAM_STAFF_ROLES)
  role!: (typeof STREAM_STAFF_ROLES)[number];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StreamPermissionToggleDto)
  permissions!: StreamPermissionToggleDto[];
}

export class UpdateStreamStaffPermissionsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => StreamRolePermissionsEntryDto)
  roles!: StreamRolePermissionsEntryDto[];
}
