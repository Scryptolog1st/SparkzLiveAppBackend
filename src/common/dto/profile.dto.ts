export type WifwEntryDto = {
  id?: string | null;
  username: string;
};

export type FavoriteUserListItemDto = {
  id: string;
  publicId?: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  bio?: string | null;
  isMutual: boolean;
  favoritedAt: string;
};

export type FavoritesListResponseDto = {
  items: FavoriteUserListItemDto[];
  total: number;
};

export type ProfileDto = {
  userId: string;
  displayName: string;
  bio?: string | null;
  wifw?: WifwEntryDto[] | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  linksJson?: Record<string, any> | null;
  streamSchedule?: import("./streams.dto").ScheduleItemDto[] | null;

  badgeLabel?: string | null;
  badgeTone?: string | null;
  showBadgeOnProfile?: boolean;

  mutualFavoritesCount?: number;
  isFavoritedByViewer?: boolean;

  diamonds?: number;
  totalDiamondsReceived?: number;
  lifetimeDiamonds?: number;

  fanCount?: number;
  fans?: number;
  favoritesCount?: number;

  createdAt: string;
  updatedAt: string;
};

export type UpdateProfileRequestDto = Partial<
  Pick<
    ProfileDto,
    | "displayName"
    | "bio"
    | "wifw"
    | "avatarUrl"
    | "bannerUrl"
    | "linksJson"
    | "showBadgeOnProfile"
  >
>;

export type MeResponseDto = {
  user: import("./user.dto").UserDto;
  profile: ProfileDto | null;
};

export type AuthResponseDto = {
  accessToken: string;
  refreshToken: string;
  user: import("./user.dto").UserDto;
  profile: ProfileDto | null;
};

export type PublicProfileResponseDto = {
  user: Pick<import("./user.dto").UserDto, "id" | "publicId" | "username">;
  profile: ProfileDto | null;
};