import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";

import { JwtAuthGuard } from "../auth/jwt/jwt-auth.guard";
import { AssignStreamStaffRoleDto } from "./dto/assign-stream-staff-role.dto";
import { UpdateStreamStaffPermissionsDto } from "./dto/update-stream-staff-permissions.dto";
import { StreamStaffService } from "./stream-staff.service";

type JwtReq = Request & {
  user?: {
    userId: string;
    username?: string;
  };
};

@Controller()
export class StreamStaffController {
  constructor(private readonly staff: StreamStaffService) { }

  @UseGuards(JwtAuthGuard)
  @Get("/streams/:id/staff/me")
  async getMyState(@Req() req: JwtReq, @Param("id") streamId: string) {
    return this.staff.getMyState(streamId, req.user!.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get("/streams/:id/staff/permissions")
  async getPermissions(@Req() req: JwtReq, @Param("id") streamId: string) {
    return this.staff.getPermissions(streamId, req.user!.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("/streams/:id/staff/permissions")
  async updatePermissions(
    @Req() req: JwtReq,
    @Param("id") streamId: string,
    @Body() dto: UpdateStreamStaffPermissionsDto,
  ) {
    return this.staff.updatePermissions(streamId, req.user!.userId, dto as any);
  }

  @UseGuards(JwtAuthGuard)
  @Get("/streams/:id/staff/assignments")
  async listAssignments(@Req() req: JwtReq, @Param("id") streamId: string) {
    return this.staff.listAssignments(streamId, req.user!.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("/streams/:id/staff/assign-role")
  async assignRole(
    @Req() req: JwtReq,
    @Param("id") streamId: string,
    @Body() dto: AssignStreamStaffRoleDto,
  ) {
    return this.staff.assignRole(
      streamId,
      req.user!.userId,
      dto.targetUserId,
      dto.role,
    );
  }
}