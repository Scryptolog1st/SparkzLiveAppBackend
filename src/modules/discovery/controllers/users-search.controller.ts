import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { RateLimitGuard } from "../../../common/guards/rate-limit.guard";
import { OptionalJwtAuthGuard } from "../../auth/jwt/optional-jwt-auth.guard";
import { DiscoveryService } from "../discovery.service";
import { UsersSearchQueryDto, UsersSearchResponse } from "../dto/users-search.dto";

type OptionalJwtRequest = Request & {
  user?: {
    userId?: string;
    username?: string;
  } | null;
};

@Controller("users")
export class UsersSearchController {
  constructor(private readonly discovery: DiscoveryService) { }

  @Get("search")
  @UseGuards(
    OptionalJwtAuthGuard,
    RateLimitGuard({
      keyPrefix: "users-search",
      limit: 30,
      windowMs: 60_000,
    }),
  )
  async search(
    @Req() req: OptionalJwtRequest,
    @Query() q: UsersSearchQueryDto,
  ): Promise<UsersSearchResponse> {
    return this.discovery.searchUsers(q, req.user?.userId);
  }
}