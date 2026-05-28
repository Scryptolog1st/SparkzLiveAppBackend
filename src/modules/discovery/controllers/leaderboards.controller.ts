import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { RateLimitGuard } from '../../../common/guards/rate-limit.guard';
import { OptionalJwtAuthGuard } from '../../auth/jwt/optional-jwt-auth.guard';
import { DiscoveryService } from '../discovery.service';
import { LeaderboardsQueryDto, LeaderboardsResponse } from '../dto/leaderboards.dto';

type OptionalJwtRequest = Request & {
  user?: {
    userId?: string;
    username?: string;
  } | null;
};

@Controller('leaderboards')
export class LeaderboardsController {
  constructor(private readonly discovery: DiscoveryService) {}

  @Get()
  @UseGuards(
    OptionalJwtAuthGuard,
    RateLimitGuard({
      keyPrefix: 'leaderboards',
      limit: 60,
      windowMs: 60_000,
    }),
  )
  async get(
    @Req() req: OptionalJwtRequest,
    @Query() q: LeaderboardsQueryDto,
  ): Promise<LeaderboardsResponse> {
    return this.discovery.getLeaderboards(q, req.user?.userId);
  }
}
