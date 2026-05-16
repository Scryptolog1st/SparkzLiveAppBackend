import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt/jwt-auth.guard";
import { UsersService } from "../users/users.service";
import { UpdateMyProfileDto } from "./dto/update-profile.dto";
import { ScheduleService } from "../schedule/schedule.service";
import { validationLimits } from "../../config/validation-limits";
import { FavoritesService } from "../favorites/favorites.service";
import { PrismaService } from "../prisma/prisma.service";

type JwtReq = Request & { user?: { userId: string; username?: string } };

@Controller()
export class ProfilesController {
  constructor(
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
    private readonly schedule: ScheduleService,
    private readonly favorites: FavoritesService,
  ) { }

  private readonly dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  private getVipMonthTimezone(): string {
    const raw = String(process.env.VIP_MONTH_TIMEZONE || "America/New_York").trim();

    try {
      new Intl.DateTimeFormat("en-US", { timeZone: raw }).format(new Date());
      return raw;
    } catch {
      return "America/New_York";
    }
  }

  private getVipPeriodKey(date = new Date()): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: this.getVipMonthTimezone(),
      year: "numeric",
      month: "2-digit",
    }).formatToParts(date);

    const year = parts.find((part) => part.type === "year")?.value ?? "1970";
    const month = parts.find((part) => part.type === "month")?.value ?? "01";

    return `${year}-${month}`;
  }

  private normalizeDateTime(value: unknown): string | undefined {
    if (typeof value !== "string" || !value.trim()) return undefined;

    const raw = value.trim();
    const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
    const date = new Date(normalized);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid date/time value: ${raw}`);
    }

    return date.toISOString();
  }

  private normalizeSchedule(items: Record<string, any>[]) {
    return items.map((item) => {
      const isRecurring = !!item?.isRecurring;
      const title =
        typeof item?.title === "string" && item.title.trim()
          ? item.title.trim()
          : "Stream";
      const description =
        typeof item?.description === "string" && item.description.trim()
          ? item.description.trim()
          : undefined;
      const timezone =
        typeof item?.timezone === "string" && item.timezone.trim()
          ? item.timezone.trim()
          : "America/New_York";

      if (title.length > validationLimits.scheduleTitleMax) {
        throw new BadRequestException(
          `Schedule title must be ${validationLimits.scheduleTitleMax} characters or fewer.`,
        );
      }

      if (
        description &&
        description.length > validationLimits.scheduleDescriptionMax
      ) {
        throw new BadRequestException(
          `Schedule description must be ${validationLimits.scheduleDescriptionMax} characters or fewer.`,
        );
      }

      if (timezone.length > validationLimits.scheduleTimezoneMax) {
        throw new BadRequestException(
          `Schedule timezone must be ${validationLimits.scheduleTimezoneMax} characters or fewer.`,
        );
      }

      if (isRecurring) {
        const rawDay = item?.dayOfWeek;
        const dayOfWeek =
          typeof rawDay === "number"
            ? rawDay
            : typeof rawDay === "string"
              ? this.dayMap[rawDay.slice(0, 3)]
              : undefined;

        const time24h =
          typeof item?.time24h === "string" && item.time24h.trim()
            ? item.time24h.trim()
            : typeof item?.time === "string" && item.time.trim()
              ? item.time.trim()
              : undefined;

        if (dayOfWeek === undefined || !time24h) {
          throw new BadRequestException(
            "Recurring schedule items require dayOfWeek and time/time24h",
          );
        }

        return {
          isRecurring: true,
          title,
          description,
          timezone,
          dayOfWeek,
          time24h,
        };
      }

      const startAt = this.normalizeDateTime(item?.startAt ?? item?.start);
      const endAt = this.normalizeDateTime(item?.endAt ?? item?.end);

      if (!startAt) {
        throw new BadRequestException("One-time schedule items require start/startAt");
      }

      return {
        isRecurring: false,
        title,
        description,
        timezone,
        startAt,
        endAt,
      };
    });
  }

  private applyLinkValue(target: Record<string, any>, key: string, value: unknown) {
    if (value === undefined) return;

    const str = typeof value === "string" ? value.trim() : "";
    if (str) {
      target[key] = str;
    } else {
      delete target[key];
    }
  }


  private async getActiveAdminAssignedBadges(userId: string) {
    const now = new Date();

    const rows = await this.prisma.userBadge.findMany({
      where: {
        userId,
        revokedAt: null,
        startsAt: { lte: now },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        badge: {
          status: "ACTIVE",
          deletedAt: null,
        },
      },
      include: {
        badge: true,
      },
      orderBy: [
        { badge: { sortOrder: "asc" } },
        { createdAt: "asc" },
      ],
      take: 30,
    });

    return rows.map((row: any) => {
      const badgeMetadata =
        row.badge.metadataJson &&
          typeof row.badge.metadataJson === "object" &&
          !Array.isArray(row.badge.metadataJson)
          ? (row.badge.metadataJson as Record<string, any>)
          : {};

      const assignmentMetadata =
        row.metadataJson &&
          typeof row.metadataJson === "object" &&
          !Array.isArray(row.metadataJson)
          ? (row.metadataJson as Record<string, any>)
          : {};

      const hasAsset = typeof row.badge.assetUrl === "string" && row.badge.assetUrl.trim().length > 0;
      const source = String(badgeMetadata.source ?? (hasAsset ? "CUSTOM" : "")).trim() || null;
      const displayType = String(badgeMetadata.displayType ?? (hasAsset ? "ACHIEVEMENT" : "")).trim() || null;
      const category = String(badgeMetadata.category ?? (hasAsset ? "ACHIEVEMENT" : "")).trim() || null;
      const mobileSurface = String(badgeMetadata.mobileSurface ?? (hasAsset ? "ACHIEVEMENTS" : "")).trim() || null;
      const renderMode = String(badgeMetadata.renderMode ?? (hasAsset ? "IMAGE_ONLY" : "")).trim() || null;
      const badgeKind = String(badgeMetadata.badgeKind ?? (hasAsset ? "CUSTOM_ACHIEVEMENT" : "")).trim() || null;

      return {
        assignmentId: row.id,
        id: row.badge.id,
        name: row.badge.name,
        label: row.badge.name,
        slug: row.badge.slug,
        description: row.badge.description ?? null,
        assetUrl: row.badge.assetUrl ?? null,
        status: row.badge.status,
        sortOrder: row.badge.sortOrder ?? 0,
        source,
        displayType,
        category,
        mobileSurface,
        renderMode,
        badgeKind,
        achievement: badgeMetadata.achievement === true || hasAsset,
        metadata: badgeMetadata,
        metadataJson: badgeMetadata,
        assignmentMetadata,
        characteristics: Array.isArray(row.badge.characteristicsJson)
          ? row.badge.characteristicsJson
          : [],
        startsAt: row.startsAt?.toISOString?.() ?? row.startsAt ?? null,
        expiresAt: row.expiresAt?.toISOString?.() ?? row.expiresAt ?? null,
        assignedAt: row.createdAt?.toISOString?.() ?? row.createdAt,
      };
    });
  }

  private async buildPublicProfileResponse(user: any, viewerUserId?: string) {
    const [
      streamSchedule,
      fanCount,
      relationship,
      currentVipMonth,
      battles,
      milestones,
      recentGiftTransactions,
    ] = await Promise.all([
      this.schedule.getScheduleByUsername(user.username),
      this.favorites.countFans(user.id),
      viewerUserId && viewerUserId !== user.id
        ? this.favorites.getViewerRelationship(viewerUserId, user.id)
        : Promise.resolve({
          mutualFavoritesCount: 0,
          isFavoritedByViewer: false,
        }),
      this.prisma.userVipMonth.findUnique({
        where: {
          userId_periodKey: {
            userId: user.id,
            periodKey: this.getVipPeriodKey(),
          },
        },
        select: {
          spendCents: true,
          highestColorBadge: true,
        },
      }),
      this.prisma.battle.findMany({
        where: {
          OR: [
            { hostUserId: user.id },
            { opponentUserId: user.id },
          ],
          status: "ENDED",
        },
        select: {
          id: true,
          winnerUserId: true,
          endedAt: true,
          updatedAt: true,
        },
        orderBy: [
          { endedAt: "desc" },
          { updatedAt: "desc" },
        ],
        take: 200,
      }),
      this.prisma.diamondMilestone.findMany({
        where: { userId: user.id },
        orderBy: { achievedAt: "desc" },
        take: 25,
        include: {
          giver: {
            include: {
              profile: true,
            },
          },
          giftTx: {
            include: {
              gift: true,
            },
          },
        },
      }),
      this.prisma.giftTransaction.findMany({
        where: { recipientUserId: user.id },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          gift: true,
          sender: {
            include: {
              profile: true,
            },
          },
        },
      }),
    ]);

    const diamonds = Number(user.wallet?.diamondsEarned ?? 0);

    const wins = battles.filter((battle) => battle.winnerUserId === user.id).length;
    const losses = battles.filter(
      (battle) => battle.winnerUserId && battle.winnerUserId !== user.id,
    ).length;

    let currentStreak = 0;
    for (const battle of battles) {
      if (battle.winnerUserId === user.id) {
        currentStreak += 1;
      } else {
        break;
      }
    }

    const giftTotals = new Map<
      string,
      {
        id: string;
        name: string;
        count: number;
        diamondValue: number;
        coinCost: number;
        mediaUrl: string | null;
        mediaType: string | null;
      }
    >();

    for (const tx of recentGiftTransactions) {
      const giftId = tx.gift?.id || tx.giftId;
      if (!giftId) continue;

      const existing = giftTotals.get(giftId);
      if (existing) {
        existing.count += 1;
        continue;
      }

      giftTotals.set(giftId, {
        id: giftId,
        name: tx.gift?.name || "Gift",
        count: 1,
        diamondValue: Number(tx.gift?.diamondValue ?? tx.diamondValue ?? 0),
        coinCost: Number(tx.gift?.coinCost ?? tx.coinCost ?? 0),
        mediaUrl: tx.gift?.mediaUrl ?? null,
        mediaType: tx.gift?.mediaType ?? null,
      });
    }

    const activeAdminBadges = await this.getActiveAdminAssignedBadges(user.id);

    const baseProfile = user.profile
      ? this.users.toProfileDto(user.profile, {
        streamSchedule,
        ...relationship,
      })
      : this.users.toFallbackProfileDto(user, {
        streamSchedule,
        ...relationship,
      });

    return {
      user: this.users.toPublicUserDto(user),
      profile: {
        ...baseProfile,
        badges: activeAdminBadges,
        diamonds,
        totalDiamondsReceived: diamonds,
        lifetimeDiamonds: diamonds,
        fanCount,
        fans: fanCount,
        favoritesCount: fanCount,
      },
      vip: {
        currentPeriodKey: this.getVipPeriodKey(),
        currentSpendCents: Number(currentVipMonth?.spendCents ?? 0),
        currentHighestColorBadge: currentVipMonth?.highestColorBadge ?? null,
        displayBadgeKey: user.profile?.vipDisplayBadgeKey ?? null,
        lockedBadgeKey: user.profile?.vipLockedBadgeKey ?? null,
        liveBadgeKey: user.profile?.vipLiveBadgeKey ?? null,
        lockedPeriodKey: user.profile?.vipLockedPeriodKey ?? null,
      },
      battleStats: {
        wins,
        losses,
        currentStreak,
        winLossRatio: losses > 0 ? Number((wins / losses).toFixed(2)) : wins > 0 ? wins : 0,
        record: `${wins} - ${losses}`,
      },
      milestones: milestones.map((milestone) => ({
        id: milestone.id,
        milestoneAmount: milestone.milestoneAmount,
        achievedAt: milestone.achievedAt.toISOString(),
        giver: milestone.giver
          ? {
            id: milestone.giver.id,
            username: milestone.giver.username,
            displayName: milestone.giver.profile?.displayName || milestone.giver.username,
            avatarUrl: milestone.giver.profile?.avatarUrl ?? null,
          }
          : null,
        gift: milestone.giftTx?.gift
          ? {
            id: milestone.giftTx.gift.id,
            name: milestone.giftTx.gift.name,
            diamondValue: milestone.giftTx.gift.diamondValue,
            coinCost: milestone.giftTx.gift.coinCost,
            mediaUrl: milestone.giftTx.gift.mediaUrl,
            mediaType: milestone.giftTx.gift.mediaType,
          }
          : null,
      })),
      gifts: {
        topGifts: Array.from(giftTotals.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
        recent: recentGiftTransactions.slice(0, 5).map((tx) => ({
          id: tx.id,
          createdAt: tx.createdAt.toISOString(),
          coinCost: tx.coinCost,
          diamondValue: tx.diamondValue,
          gift: tx.gift
            ? {
              id: tx.gift.id,
              name: tx.gift.name,
              diamondValue: tx.gift.diamondValue,
              coinCost: tx.gift.coinCost,
              mediaUrl: tx.gift.mediaUrl,
              mediaType: tx.gift.mediaType,
            }
            : null,
          sender: tx.sender
            ? {
              id: tx.sender.id,
              username: tx.sender.username,
              displayName: tx.sender.profile?.displayName || tx.sender.username,
              avatarUrl: tx.sender.profile?.avatarUrl ?? null,
            }
            : null,
        })),
      },
    };
  }

  @Get("/config/profile-limits")
  getProfileLimits() {
    return validationLimits;
  }

  @Get("/users/:username/profile")
  async getPublicProfile(@Param("username") identifier: string) {
    const user = await this.users.requireByIdentifier(identifier);
    return this.buildPublicProfileResponse(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get("/users/:username/profile/viewer")
  async getViewerProfile(
    @Param("username") identifier: string,
    @Req() req: JwtReq,
  ) {
    const viewerUserId = req.user?.userId;
    if (!viewerUserId) {
      throw new BadRequestException("Missing user");
    }

    const user = await this.users.requireByIdentifier(identifier);
    return this.buildPublicProfileResponse(user, viewerUserId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch("/me/profile")
  async updateMyProfile(@Req() req: JwtReq, @Body() dto: UpdateMyProfileDto) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException("Missing user");
    }

    const existing = await this.users.findByIdWithProfile(userId);
    const existingLinks =
      existing.profile?.linksJson && typeof existing.profile.linksJson === "object"
        ? { ...(existing.profile.linksJson as Record<string, any>) }
        : {};

    if (
      dto.linksJson &&
      typeof dto.linksJson === "object" &&
      !Array.isArray(dto.linksJson)
    ) {
      for (const [key, value] of Object.entries(dto.linksJson)) {
        if (typeof value === "string") {
          const trimmed = value.trim();
          if (trimmed) {
            existingLinks[key] = trimmed;
          } else {
            delete existingLinks[key];
          }
        } else if (value === null || value === undefined) {
          delete existingLinks[key];
        } else {
          existingLinks[key] = value;
        }
      }
    }

    this.applyLinkValue(existingLinks, "location", dto.location);
    this.applyLinkValue(existingLinks, "birthday", dto.birthdate);
    this.applyLinkValue(existingLinks, "website", dto.website);
    this.applyLinkValue(existingLinks, "instagram", dto.instagram);
    this.applyLinkValue(existingLinks, "youtube", dto.youtube);

    const finalLinks = Object.keys(existingLinks).length ? existingLinks : null;

    const updated = await this.users.updateMyProfile(userId, {
      displayName: dto.displayName,
      bio: dto.bio ?? dto.about,
      wifw: dto.wifw as any,
      avatarUrl: dto.avatarUrl,
      bannerUrl: dto.bannerUrl,
      linksJson: finalLinks,
      showBadgeOnProfile: dto.showBadgeOnProfile,
    });

    const streamSchedule =
      dto.streamSchedule !== undefined
        ? await this.schedule.replaceMySchedule(
          userId,
          this.normalizeSchedule(dto.streamSchedule),
        )
        : await this.schedule.getScheduleByUsername(updated.username);

    return {
      user: this.users.toUserDto(updated),
      profile: updated.profile
        ? this.users.toProfileDto(updated.profile, {
          streamSchedule,
        })
        : this.users.toFallbackProfileDto(updated, {
          streamSchedule,
        }),
    };
  }
}