import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    Req,
    UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { AdminStoreService } from "./admin-store.service";
import { CreateAdminPackageDto } from "./dto/create-admin-package.dto";
import {
    AdminStoreTransactionsQueryDto,
    AdminStoreUsersQueryDto,
} from "./dto/admin-store-query.dto";
import { UpdateAdminPackageDto } from "./dto/update-admin-package.dto";

@Controller("admin/store")
@UseGuards(AuthGuard("jwt"))
export class AdminStoreController {
    constructor(private readonly adminStore: AdminStoreService) { }

    @Get("me")
    async me(@Req() req: any) {
        return this.adminStore.getMe(req.user.userId);
    }

    @Get("overview")
    async overview(@Req() req: any) {
        return this.adminStore.getOverview(req.user.userId);
    }

    @Get("packages")
    async listPackages(@Req() req: any) {
        return this.adminStore.listPackages(req.user.userId);
    }

    @Post("packages")
    async createPackage(@Req() req: any, @Body() dto: CreateAdminPackageDto) {
        return this.adminStore.createPackage(req.user.userId, dto);
    }

    @Patch("packages/:id")
    async updatePackage(
        @Req() req: any,
        @Param("id") id: string,
        @Body() dto: UpdateAdminPackageDto,
    ) {
        return this.adminStore.updatePackage(req.user.userId, id, dto);
    }

    @Delete("packages/:id")
    async deletePackage(@Req() req: any, @Param("id") id: string) {
        return this.adminStore.deletePackage(req.user.userId, id);
    }

    @Get("transactions")
    async listTransactions(
        @Req() req: any,
        @Query() query: AdminStoreTransactionsQueryDto,
    ) {
        return this.adminStore.listTransactions(req.user.userId, query);
    }

    @Get("users")
    async listUsers(
        @Req() req: any,
        @Query() query: AdminStoreUsersQueryDto,
    ) {
        return this.adminStore.listUsers(req.user.userId, query);
    }

    @Get("users/:id")
    async getUser(@Req() req: any, @Param("id") id: string) {
        return this.adminStore.getUser(req.user.userId, id);
    }
}