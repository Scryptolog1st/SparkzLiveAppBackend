import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { Prisma, Profile, User } from "@prisma/client";
import { randomInt } from "crypto";
import * as bcrypt from "bcryptjs";

const USER_WITH_PROFILE_INCLUDE = {
  profile: true,
  wallet: true,
} satisfies Prisma.UserInclude;

export type UserWithProfile = Prisma.UserGetPayload<{
  include: typeof USER_WITH_PROFILE_INCLUDE;
}>;

export type WifwEntry = {
  id: string | null;
  username: string;
};

export type UpdateProfileInput = {
  /**
   * Kept temporarily for backward compatibility with older callers.
   * Username is immutable after account creation and any attempted change is rejected.
   */
  username?: string;
  displayName?: string;
  bio?: string | null;
  wifw?: WifwEntry[] | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  linksJson?: Record<string, any> | null;
  showBadgeOnProfile?: boolean;
};

@Injectable()
export class UsersService {
  private readonly THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;

  constructor(private readonly prisma: PrismaService) { }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );
  }

  private normalizeEmail(value: string): string {
    return String(value || "").trim().toLowerCase();
  }

  private normalizeUsername(value: string): string {
    return String(value || "").trim().toLowerCase();
  }

  private resolveDisplayName(
    user: Pick<User, "username"> & { profile?: Pick<Profile, "displayName"> | null },
    explicitProfile?: Pick<Profile, "displayName"> | null,
  ): string {
    const source = explicitProfile ?? user.profile ?? null;
    const displayName =
      typeof source?.displayName === "string" ? source.displayName.trim() : "";

    return displayName || user.username;
  }

  private normalizeWifw(input: unknown): WifwEntry[] | null {
    if (!Array.isArray(input)) return null;

    const normalized = input
      .map((entry): WifwEntry | null => {
        if (!entry || typeof entry !== "object") return null;

        const raw = entry as Record<string, unknown>;
        const username =
          typeof raw.username === "string" ? raw.username.trim() : "";

        if (!username) return null;

        const id =
          typeof raw.id === "string" && raw.id.trim().length > 0
            ? raw.id.trim()
            : null;

        return { id, username };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    return normalized.length ? normalized : [];
  }

  private async generateUniquePublicId(
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    for (let i = 0; i < 25; i++) {
      const publicId = String(
        randomInt(1_000_000_000_000, 10_000_000_000_000),
      );
      const existing = await tx.user.findUnique({
        where: { publicId },
        select: { id: true },
      });

      if (!existing) {
        return publicId;
      }
    }

    throw new ConflictException("Failed to generate unique public ID");
  }

  async findByIdWithProfile(userId: string): Promise<UserWithProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: USER_WITH_PROFILE_INCLUDE,
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  async findByEmail(email: string): Promise<UserWithProfile | null> {
    const normalizedEmail = this.normalizeEmail(email);
    if (!normalizedEmail) return null;

    const matches = await this.prisma.user.findMany({
      where: {
        email: {
          equals: normalizedEmail,
          mode: "insensitive",
        },
      },
      include: USER_WITH_PROFILE_INCLUDE,
      take: 2,
    });

    if (matches.length > 1) {
      throw new ConflictException(
        "Multiple users match this email. Please contact support.",
      );
    }

    return matches[0] ?? null;
  }

  async findByUsername(username: string): Promise<UserWithProfile | null> {
    const normalizedUsername = this.normalizeUsername(username);
    if (!normalizedUsername) return null;

    const matches = await this.prisma.user.findMany({
      where: {
        username: {
          equals: normalizedUsername,
          mode: "insensitive",
        },
      },
      include: USER_WITH_PROFILE_INCLUDE,
      take: 2,
    });

    if (matches.length > 1) {
      throw new ConflictException(
        "Multiple users match this username. Please contact support.",
      );
    }

    return matches[0] ?? null;
  }

  async findByPublicId(publicId: string): Promise<UserWithProfile | null> {
    return this.prisma.user.findUnique({
      where: { publicId },
      include: USER_WITH_PROFILE_INCLUDE,
    });
  }

  async requireByUsername(username: string): Promise<UserWithProfile> {
    const user = await this.findByUsername(username);
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  async findByIdentifier(identifier: string): Promise<UserWithProfile | null> {
    const key = String(identifier || "").trim();
    if (!key) {
      return null;
    }

    if (/^\d{13}$/.test(key)) {
      const byPublicId = await this.findByPublicId(key);
      if (byPublicId) return byPublicId;
    }

    if (this.isUuid(key)) {
      const byId = await this.prisma.user.findUnique({
        where: { id: key },
        include: USER_WITH_PROFILE_INCLUDE,
      });
      if (byId) return byId;
    }

    const byUsername = await this.findByUsername(key);
    if (byUsername) return byUsername;

    return null;
  }

  async requireByIdentifier(identifier: string): Promise<UserWithProfile> {
    const user = await this.findByIdentifier(identifier);
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return user;
  }

  async createUser(params: {
    email: string;
    username: string;
    passwordHash: string;
  }): Promise<UserWithProfile> {
    const email = this.normalizeEmail(params.email);
    const username = this.normalizeUsername(params.username);
    const { passwordHash } = params;

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const publicId = await this.generateUniquePublicId(tx);

      const user = await tx.user.create({
        data: {
          email,
          username,
          publicId,
          passwordHash,
          profile: {
            create: {
              displayName: username,
              showBadgeOnProfile: true,
            },
          },
        },
        include: USER_WITH_PROFILE_INCLUDE,
      });

      return user;
    });
  }

  async updateEmail(userId: string, newEmail: string) {
    const user = await this.findByIdWithProfile(userId);
    const normalizedEmail = this.normalizeEmail(newEmail);
    const now = new Date();

    if (!normalizedEmail) {
      throw new BadRequestException("Email cannot be empty");
    }

    if (user.emailUpdatedAt) {
      const nextAllowed = user.emailUpdatedAt.getTime() + this.THREE_MONTHS_MS;
      if (now.getTime() < nextAllowed) {
        throw new BadRequestException(
          `Email can only be changed once every 3 months. Next available: ${new Date(nextAllowed).toLocaleDateString()}`,
        );
      }
    }

    const taken = await this.prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: "insensitive",
        },
        NOT: { id: userId },
      },
      select: { id: true },
    });
    if (taken) throw new ConflictException("Email already in use");

    return this.prisma.user.update({
      where: { id: userId },
      data: { email: normalizedEmail, emailUpdatedAt: now },
      include: USER_WITH_PROFILE_INCLUDE,
    });
  }

  async updatePassword(userId: string, currentPass: string, newPass: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException();

    const isMatch = await bcrypt.compare(currentPass, user.passwordHash);
    if (!isMatch) throw new BadRequestException("Current password is incorrect");

    const newHash = await bcrypt.hash(newPass, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { success: true };
  }

  async updateMyProfile(
    userId: string,
    input: UpdateProfileInput,
  ): Promise<UserWithProfile> {
    const existingUser = await this.findByIdWithProfile(userId);

    const requestedUsername =
      input.username !== undefined ? input.username.trim() : undefined;

    if (
      requestedUsername !== undefined &&
      requestedUsername !== existingUser.username
    ) {
      throw new BadRequestException(
        "Username cannot be changed after account creation",
      );
    }

    const displayName =
      input.displayName !== undefined
        ? input.displayName.trim() || existingUser.username
        : undefined;

    const bio =
      input.bio === "" ? null : input.bio !== undefined ? input.bio : undefined;

    const normalizedWifw =
      input.wifw !== undefined ? this.normalizeWifw(input.wifw) : undefined;

    await this.prisma.$transaction(async (tx) => {
      const data: Prisma.ProfileUpdateInput = {
        ...(displayName !== undefined ? { displayName } : {}),
        ...(bio !== undefined ? { bio } : {}),
        ...(normalizedWifw !== undefined ? { wifw: normalizedWifw as any } : {}),
        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
        ...(input.bannerUrl !== undefined ? { bannerUrl: input.bannerUrl } : {}),
        ...(input.linksJson !== undefined
          ? { linksJson: input.linksJson as any }
          : {}),
        ...(input.showBadgeOnProfile !== undefined
          ? { showBadgeOnProfile: input.showBadgeOnProfile }
          : {}),
      };

      const existingProfile = await tx.profile.findUnique({ where: { userId } });

      if (!existingProfile) {
        await tx.profile.create({
          data: {
            userId,
            displayName: displayName ?? this.resolveDisplayName(existingUser),
            bio: bio ?? null,
            wifw: normalizedWifw !== undefined ? (normalizedWifw as any) : null,
            avatarUrl: input.avatarUrl ?? null,
            bannerUrl: input.bannerUrl ?? null,
            linksJson: (input.linksJson as any) ?? null,
            badgeLabel: null,
            badgeTone: null,
            vipDisplayBadgeKey: null,
            vipLockedBadgeKey: null,
            vipLiveBadgeKey: null,
            vipLockedPeriodKey: null,
            showBadgeOnProfile: input.showBadgeOnProfile ?? true,
          },
        });
      } else {
        await tx.profile.update({
          where: { userId },
          data,
        });
      }
    });

    return this.findByIdWithProfile(userId);
  }

  toUserDto(user: UserWithProfile | User) {
    const wallet = (user as UserWithProfile).wallet ?? null;

    return {
      id: user.id,
      publicId: (user as any).publicId,
      email: user.email,
      username: user.username,
      twoFactorEnabled: (user as any).twoFactorEnabled || false,
      wallet: wallet
        ? {
          coins: wallet.coins,
          diamondsEarned: wallet.diamondsEarned,
        }
        : null,
      emailUpdatedAt: (user as any).emailUpdatedAt
        ? (user as any).emailUpdatedAt.toISOString()
        : null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  toPublicUserDto(user: UserWithProfile | User) {
    return {
      id: user.id,
      publicId: (user as any).publicId,
      username: user.username,
    };
  }

  toProfileDto(
    profile: Profile,
    extras: Partial<{
      streamSchedule: any[] | null;
      mutualFavoritesCount: number;
      isFavoritedByViewer: boolean;
    }> = {},
  ) {
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      bio: profile.bio,
      wifw: (profile.wifw as any) ?? null,
      avatarUrl: profile.avatarUrl,
      bannerUrl: profile.bannerUrl,
      linksJson: (profile.linksJson as any) ?? null,
      badgeLabel: profile.badgeLabel ?? null,
      badgeTone: profile.badgeTone ?? null,
      vipDisplayBadgeKey: (profile as any).vipDisplayBadgeKey ?? null,
      vipLockedBadgeKey: (profile as any).vipLockedBadgeKey ?? null,
      vipLiveBadgeKey: (profile as any).vipLiveBadgeKey ?? null,
      vipLockedPeriodKey: (profile as any).vipLockedPeriodKey ?? null,
      showBadgeOnProfile:
        typeof (profile as any).showBadgeOnProfile === "boolean"
          ? (profile as any).showBadgeOnProfile
          : true,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
      ...extras,
    };
  }

  toFallbackProfileDto(
    user: (UserWithProfile | User) & {
      profile?: Pick<Profile, "displayName"> | null;
    },
    extras: Partial<{
      streamSchedule: any[] | null;
      mutualFavoritesCount: number;
      isFavoritedByViewer: boolean;
    }> = {},
  ) {
    return {
      userId: user.id,
      displayName: this.resolveDisplayName(user),
      bio: null,
      wifw: null,
      avatarUrl: null,
      bannerUrl: null,
      linksJson: null,
      badgeLabel: null,
      badgeTone: null,
      vipDisplayBadgeKey: null,
      vipLockedBadgeKey: null,
      vipLiveBadgeKey: null,
      vipLockedPeriodKey: null,
      showBadgeOnProfile: true,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      ...extras,
    };
  }

  toFavoriteUserListItemDto(
    user: UserWithProfile,
    extras: {
      isMutual?: boolean;
      favoritedAt?: Date | string | null;
    } = {},
  ) {
    const favoritedAt =
      extras.favoritedAt instanceof Date
        ? extras.favoritedAt.toISOString()
        : typeof extras.favoritedAt === "string" && extras.favoritedAt
          ? extras.favoritedAt
          : new Date(0).toISOString();

    return {
      id: user.id,
      publicId: (user as any).publicId,
      username: user.username,
      displayName: this.resolveDisplayName(user),
      avatarUrl: user.profile?.avatarUrl ?? null,
      bannerUrl: user.profile?.bannerUrl ?? null,
      bio: user.profile?.bio ?? null,
      isMutual: !!extras.isMutual,
      favoritedAt,
    };
  }
}
