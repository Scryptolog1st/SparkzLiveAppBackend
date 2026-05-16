import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from "@nestjs/common";

import { AdminProxyGuard } from "./admin-proxy.guard";
import { AdminRolePermissionsService } from "./admin-role-permissions.service";
import { UpdateAdminRolePermissionsDto } from "./dto/admin-role-permissions.dto";

@Controller("admin/permissions")
@UseGuards(AdminProxyGuard)
export class AdminRolePermissionsController {
    constructor(
        private readonly rolePermissions: AdminRolePermissionsService,
    ) { }

    @Get()
    async list(@Req() req: any) {
        return this.rolePermissions.listRolePermissions(req.adminUser.id);
    }

    @Put(":role")
    async updateRole(
        @Req() req: any,
        @Param("role") role: string,
        @Body() body: UpdateAdminRolePermissionsDto,
    ) {
        return this.rolePermissions.updateRolePermissions(
            req.adminUser.id,
            role,
            body.permissions,
        );
    }

    @Post(":role/reset")
    async resetRole(@Req() req: any, @Param("role") role: string) {
        return this.rolePermissions.resetRolePermissions(req.adminUser.id, role);
    }
}