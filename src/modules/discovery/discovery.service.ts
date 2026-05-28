import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersSearchQueryDto, UsersSearchResponse } from './dto/users-search.dto';
import { ExploreLiveStreamsQueryDto, ExploreLiveStreamsResponse } from './dto/explore.dto';
import { LeaderboardsQueryDto, LeaderboardsResponse, LeaderboardType } from './dto/leaderboards.dto';

type DiscoveryBoostRecord = {
  userId: string;
  username: string;
  expiresAt: string;
};

type DiscoveryHiddenRecord = {
  userId: string;
  username: string;
  reason: string | null;
  hiddenAt: string;
};

@Injectable()
export class DiscoveryService {
  constructor(private readonly prisma: PrismaService) { }

  private resolveSince(period: 'daily' | 'weekly' | 'monthly' | 'alltime'): Date | null {
    if (period === 'alltime') return null;
    if (period === 'daily') return new Date(Date.now() - 24 * 60 * 60_000);
    if (period === 'weekly') return new Date(Date.now() - 7 * 24 * 60 * 60_000);
    return new Date(Date.now() - 30 * 24 * 60 * 60_000);
  }

  private publicUserSummary(user: any) {
    const displayName =
      typeof user?.profile?.displayName === 'string'
        ? user.profile.displayName.trim()
        : '';

    return {
      id: user.id,
      publicId: user.publicId ?? null,
      username: user.username,
      displayName: displayName || user.username,
      avatarUrl: user.profile?.avatarUrl ?? null,
    };
  }

  private async getConfigRecord<T = any>(key: string, fallback: T): Promise<T> {
    const row = await this.prisma.appConfig.findUnique({
      where: { key },
    });

    if (!row) return fallback;
    return row.valueJson as T;
  }

  private async getDiscoveryControls() {
    const [boosts, hidden] = await Promise.all([
      this.getConfigRecord<DiscoveryBoostRecord[]>('discovery_boosts', []),
      this.getConfigRecord<DiscoveryHiddenRecord[]>('discovery_hidden', []),
    ]);

    const now = Date.now();

    const activeBoosts = boosts.filter((row) => {
      const expiresAt = new Date(row.expiresAt).getTime();
      return Number.isFinite(expiresAt) && expiresAt > now;
    });

    const boostMap = new Map<string, DiscoveryBoostRecord>();
    for (const row of activeBoosts) {
      boostMap.set(row.userId, row);
    }

    const hiddenSet = new Set(hidden.map((row) => row.userId));

    return {
      boosts: activeBoosts,
      boostMap,
      hiddenSet,
    };
  }

  /**
   * Helper: Fetches all IDs where a block exists (either blocker or blocked)
   * to ensure mutual invisibility.
   */
  private async getExcludedUserIds(currentUserId?: string): Promise<string[]> {
    if (!currentUserId) return [];

    const blocks = await this.prisma.userBlock.findMany({
      where: {
        OR: [{ blockerId: currentUserId }, { blockedId: currentUserId }],
      },
      select: { blockerId: true, blockedId: true },
    });

    const ids = new Set<string>();
    blocks.forEach((b: any) => {
      if (b.blockerId === currentUserId) ids.add(b.blockedId);
      if (b.blockedId === currentUserId) ids.add(b.blockerId);
    });

    return Array.from(ids);
  }

  async searchUsers(
    q: UsersSearchQueryDto,
    currentUserId?: string,
  ): Promise<UsersSearchResponse> {
    const limit = q.limit ?? 20;
    const query = q.q?.trim() ?? '';

    if (query.length === 1) {
      throw new BadRequestException('Query must be empty or at least 2 characters.');
    }

    const [excludeIds, discoveryControls] = await Promise.all([
      this.getExcludedUserIds(currentUserId),
      this.getDiscoveryControls(),
    ]);

    const hiddenIds = Array.from(discoveryControls.hiddenSet);
    const finalExcluded = Array.from(
      new Set([
        ...excludeIds,
        ...hiddenIds,
        ...(currentUserId ? [currentUserId] : []),
      ]),
    );

    const where: any = {
      ...(finalExcluded.length ? { id: { notIn: finalExcluded } } : {}),
      ...(query.length >= 2
        ? {
          OR: [
            { username: { contains: query, mode: 'insensitive' } },
            { publicId: { contains: query, mode: 'insensitive' } },
            {
              profile: {
                displayName: { contains: query, mode: 'insensitive' },
              },
            },
          ],
        }
        : {}),
    };

    const results = await this.prisma.user.findMany({
      where,
      take: Math.max(limit * 3, 50),
      ...(q.cursor ? { skip: 1, cursor: { id: q.cursor } } : {}),
      orderBy: [{ id: 'asc' }],
      include: {
        profile: true,
        ...(currentUserId
          ? {
            favoritedBy: {
              where: { userId: currentUserId },
              select: { userId: true },
              take: 1,
            },
          }
          : {}),
      },
    });

    const ids = results.map((u) => u.id);

    const live = await this.prisma.stream.findMany({
      where: { status: 'LIVE', hostUserId: { in: ids } },
      select: { id: true, hostUserId: true },
    });

    const liveByHost = new Map<string, string>();
    for (const s of live) {
      liveByHost.set(s.hostUserId, s.id);
    }

    const mapped = results.map((user: any) => ({
      ...this.publicUserSummary(user),
      bannerUrl: user.profile?.bannerUrl ?? null,
      bio: user.profile?.bio ?? null,
      isLive: liveByHost.has(user.id),
      liveStreamId: liveByHost.get(user.id) ?? null,
      isFavoritedByViewer: currentUserId ? !!user.favoritedBy?.length : false,
      boosted: discoveryControls.boostMap.has(user.id),
    }));

    mapped.sort((a, b) => {
      const aBoost = a.boosted ? 1 : 0;
      const bBoost = b.boosted ? 1 : 0;
      if (aBoost !== bBoost) return bBoost - aBoost;
      return a.username.localeCompare(b.username);
    });

    const pageItems = mapped.slice(0, limit);

    return {
      q: query,
      limit,
      cursor: q.cursor ?? null,
      nextCursor:
        mapped.length > limit && pageItems.length > 0
          ? pageItems[pageItems.length - 1].id
          : null,
      results: pageItems.map(({ boosted, ...item }) => item),
    };
  }

  async getExploreLiveStreams(
    q: ExploreLiveStreamsQueryDto,
    currentUserId?: string,
  ): Promise<ExploreLiveStreamsResponse> {
    const sort = q.sort ?? 'recent';
    const limit = q.limit ?? 20;
    const windowMinutes = q.windowMinutes ?? 10;

    const baseTake = Math.min(200, Math.max(limit * 5, 50));
    const since = new Date(Date.now() - windowMinutes * 60_000);

    const [excludeIds, discoveryControls] = await Promise.all([
      this.getExcludedUserIds(currentUserId),
      this.getDiscoveryControls(),
    ]);

    const hiddenIds = Array.from(discoveryControls.hiddenSet);
    const finalExcluded = Array.from(new Set([...excludeIds, ...hiddenIds]));

    const liveStreams = await this.prisma.stream.findMany({
      where: {
        status: 'LIVE',
        hostUserId: { notIn: finalExcluded },
      },
      take: baseTake,
      ...(q.cursor ? { skip: 1, cursor: { id: q.cursor } } : {}),
      orderBy: [{ startedAt: 'desc' }],
      select: {
        id: true,
        hostUserId: true,
        title: true,
        startedAt: true,
      
        tagsJson: true,
      },
    });

    const streamIds = liveStreams.map((s) => s.id);
    const hostIds = Array.from(new Set(liveStreams.map((s) => s.hostUserId)));

    const streamIdsForCategoryLookup = liveStreams
      .map((stream: any) => String(stream?.id || "").trim())
      .filter(Boolean);

    const streamCategoryLinks = streamIdsForCategoryLookup.length
      ? await (this.prisma as any).$queryRawUnsafe(
        `SELECT
           s.id::text AS "streamId",
           sc.id::text AS "categoryId",
           sc.name AS "categoryName",
           sc.slug AS "categorySlug"
         FROM streams s
         LEFT JOIN stream_categories sc ON sc.id = s.stream_category_id
         WHERE s.id::text IN (${streamIdsForCategoryLookup.map((_: string, index: number) => `$${index + 1}`).join(", ")})`,
        ...streamIdsForCategoryLookup,
      )
      : [];

    const streamCategoryByStreamId = new Map<string, any>(
      streamCategoryLinks.map((row: any) => [
        String(row.streamId),
        row.categoryId
          ? {
            id: String(row.categoryId),
            name: row.categoryName ?? null,
            slug: row.categorySlug ?? null,
          }
          : null,
      ]),
    );

    const hosts = await this.prisma.user.findMany({
      where: { id: { in: hostIds } },
      include: { profile: true },
    });

    const hostById = new Map(
      hosts.map((host: any) => [host.id, this.publicUserSummary(host)]),
    );

    const viewerCounts = await this.prisma.streamParticipant.groupBy({
      by: ['streamId'],
      where: { streamId: { in: streamIds }, leftAt: null },
      _count: { _all: true },
    });

    const viewerByStream = new Map(
      viewerCounts.map((row) => [row.streamId, row._count._all]),
    );

    const chatCounts = await this.prisma.chatMessage.groupBy({
      by: ['streamId'],
      where: { streamId: { in: streamIds }, createdAt: { gte: since } },
      _count: { _all: true },
    });

    const chatByStream = new Map(
      chatCounts.map((row) => [row.streamId, row._count._all]),
    );

    const giftCounts = await this.prisma.giftTransaction.groupBy({
      by: ['streamId'],
      where: { streamId: { in: streamIds }, createdAt: { gte: since } },
      _count: { _all: true },
    });

    const giftsByStream = new Map(
      giftCounts.map((row) => [row.streamId, row._count._all]),
    );

    const enriched = liveStreams
      .map((stream) => {
        const viewerCount = viewerByStream.get(stream.id) ?? 0;
        const chatCountWindow = chatByStream.get(stream.id) ?? 0;
        const giftsCountWindow = giftsByStream.get(stream.id) ?? 0;
        const trendingScore = viewerCount * 5 + chatCountWindow + giftsCountWindow * 2;
        const boosted = discoveryControls.boostMap.has(stream.hostUserId);
        const host = hostById.get(stream.hostUserId);

        if (!host) {
          return null;
        }

        const tags = Array.isArray((stream as any).tagsJson)
          ? ((stream as any).tagsJson as any[]).map((tag) => String(tag ?? "").trim()).filter(Boolean)
          : [];
        const streamCategory = streamCategoryByStreamId.get(String(stream.id)) ?? null;
        const categoryName = streamCategory?.name ?? null;
        const categorySlug = streamCategory?.slug ?? null;

return {
          id: stream.id,
          title: String((stream as any).title || "").trim(),
          streamTitle: String((stream as any).title || "").trim(),
          host,
          startedAt: stream.startedAt.toISOString(),
          viewerCount,
          chatCountWindow,
          giftsCountWindow,
          trendingScore,
          tags,
          category: categoryName,
          categoryId: streamCategory?.id ?? null,
          categoryName,
          categorySlug,
          streamCategory: streamCategory
            ? {
              id: streamCategory.id,
              name: streamCategory.name,
              slug: streamCategory.slug,
            }
            : null,
          streamCategoryName: categoryName,
          streamCategorySlug: categorySlug,
          boosted,
          finalScore: trendingScore + (boosted ? 100000 : 0),
        };
      })
      .filter((stream): stream is NonNullable<typeof stream> => stream !== null);

    const sorted =
      sort === 'trending'
        ? enriched.sort(
          (a, b) =>
            b.finalScore - a.finalScore ||
            b.viewerCount - a.viewerCount ||
            b.startedAt.localeCompare(a.startedAt),
        )
        : enriched.sort((a, b) => {
          if (a.boosted !== b.boosted) return a.boosted ? -1 : 1;
          return b.startedAt.localeCompare(a.startedAt);
        });

    const sliced = sorted.slice(0, limit);
    const nextCursor =
      liveStreams.length === baseTake ? liveStreams[liveStreams.length - 1].id : null;

    return {
      sort,
      windowMinutes,
      limit,
      cursor: q.cursor ?? null,
      nextCursor,
      streams: sliced.map(({ boosted, finalScore, ...rest }) => rest),
    };
  }

  private leaderboardValueLabel(type: LeaderboardType): string {
    if (type === 'diamonds') return 'diamonds';
    if (type === 'likes_sent') return 'likes sent';
    if (type === 'gifters') return 'gift rank';
    if (type === 'stream_time') return 'stream time';
    if (type === 'likes_received') return 'likes received';
    if (type === 'favorites') return 'fans';
    return 'value';
  }

  private leaderboardHidesValues(type: LeaderboardType): boolean {
    return type === 'gifters';
  }

  private leaderboardSourceSql(type: LeaderboardType): string {
    if (type === 'diamonds') {
      return `
        SELECT
          user_id::text AS "userId",
          diamonds_earned::bigint AS value
        FROM wallets
      `;
    }

    if (type === 'likes_sent') {
      return `
        SELECT
          sender_user_id::text AS "userId",
          SUM(count)::bigint AS value
        FROM stream_heart_stats
        GROUP BY sender_user_id
      `;
    }

    if (type === 'gifters') {
      return `
        SELECT
          sender_user_id::text AS "userId",
          SUM(diamond_value)::bigint AS value
        FROM gift_transactions
        GROUP BY sender_user_id
      `;
    }

    if (type === 'stream_time') {
      return `
        SELECT
          host_user_id::text AS "userId",
          SUM(
            GREATEST(
              0,
              FLOOR(EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at)))
            )
          )::bigint AS value
        FROM streams
        GROUP BY host_user_id
      `;
    }

    if (type === 'likes_received') {
      return `
        SELECT
          host_user_id::text AS "userId",
          SUM(count)::bigint AS value
        FROM stream_heart_stats
        GROUP BY host_user_id
      `;
    }

    return `
      SELECT
        favorite_user_id::text AS "userId",
        COUNT(*)::bigint AS value
      FROM user_favorites
      GROUP BY favorite_user_id
    `;
  }

  private mapLeaderboardRow(row: any) {
    return {
      rank: Number(row.rank ?? 0),
      user: {
        id: String(row.userId ?? ''),
        publicId: row.publicId ?? null,
        username: String(row.username ?? ''),
        displayName: row.displayName ? String(row.displayName) : null,
        avatarUrl: row.avatarUrl ? String(row.avatarUrl) : null,
      },
      value: Number(row.value ?? 0),
    };
  }

  async getLeaderboards(
    q: LeaderboardsQueryDto,
    currentUserId?: string,
  ): Promise<LeaderboardsResponse> {
    const period = 'alltime' as const;
    const type = q.type ?? 'diamonds';
    const limit = Math.min(100, Math.max(1, q.limit ?? 50));
    const sourceSql = this.leaderboardSourceSql(type);
    const currentUserIdForSql = currentUserId ?? '';

    const rows = await this.prisma.$queryRawUnsafe<any[]>(
      `
      WITH source AS (
        ${sourceSql}
      ),
      filtered_source AS (
        SELECT
          "userId",
          COALESCE(value, 0)::bigint AS value
        FROM source
        WHERE COALESCE(value, 0) > 0
      ),
      ranked AS (
        SELECT
          ROW_NUMBER() OVER (
            ORDER BY
              fs.value DESC,
              COALESCE(NULLIF(p.display_name, ''), u.username) ASC,
              u.id::text ASC
          ) AS rank,
          COUNT(*) OVER() AS "totalUsers",
          SUM(fs.value) OVER() AS "totalValue",
          u.id::text AS "userId",
          u.public_id AS "publicId",
          u.username AS username,
          COALESCE(NULLIF(p.display_name, ''), u.username) AS "displayName",
          p.avatar_url AS "avatarUrl",
          fs.value AS value
        FROM filtered_source fs
        JOIN users u ON u.id = fs."userId"::uuid
        LEFT JOIN profiles p ON p.user_id = u.id
        WHERE COALESCE(u.is_platform_banned, false) = false
      )
      SELECT *
      FROM ranked
      WHERE rank <= $1 OR "userId" = $2
      ORDER BY rank ASC
      `,
      limit,
      currentUserIdForSql,
    );

    const items = rows
      .filter((row) => Number(row.rank ?? 0) <= limit)
      .map((row) => this.mapLeaderboardRow(row));

    const currentUserRow = currentUserId
      ? rows.find((row) => String(row.userId ?? '') === currentUserId)
      : null;

    const totalValue = rows.length > 0 ? Number(rows[0].totalValue ?? 0) : 0;
    const totalUsers = rows.length > 0 ? Number(rows[0].totalUsers ?? 0) : 0;

    return {
      period,
      type,
      generatedAt: new Date().toISOString(),
      valueLabel: this.leaderboardValueLabel(type),
      hideValues: this.leaderboardHidesValues(type),
      totalValue,
      totalDiamonds: type === 'diamonds' ? totalValue : 0,
      totalUsers,
      items,
      currentUserRank: currentUserRow ? this.mapLeaderboardRow(currentUserRow) : null,
    };
  }
}
