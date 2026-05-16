import { Controller, Get, Query } from '@nestjs/common';
import { DiscoveryService } from '../discovery.service';
import { LeaderboardsQueryDto, LeaderboardsResponse } from '../dto/leaderboards.dto';

@Controller('leaderboards')
export class LeaderboardsController {
  constructor(private readonly discovery: DiscoveryService) {}

  @Get()
  async get(@Query() q: LeaderboardsQueryDto): Promise<LeaderboardsResponse> {
    return this.discovery.getLeaderboards(q);
  }
}
