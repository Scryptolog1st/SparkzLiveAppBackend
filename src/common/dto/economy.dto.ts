export type GiftCatalogItemDto = {
  id: string;
  name: string;
  diamondValue: number;
  coinCost: number;
  mediaUrl: string;
  mediaType: "video" | "lottie" | "gif" | "image";
};

export type CreatorEarningsSummaryDto = {
  pendingDiamonds: number;
  pendingAmountCents: number;

  availableDiamonds: number;
  availableAmountCents: number;

  lockedDiamonds: number;
  lockedAmountCents: number;

  paidDiamonds: number;
  paidAmountCents: number;

  reversedDiamonds: number;
  reversedAmountCents: number;
};

export type WalletResponseDto = {
  userId: string;
  coins: number;

  /**
   * Fast display snapshot only.
   * Do not use this field as payout eligibility authority.
   * Creator payout eligibility must come from StreamerEarning rows.
   */
  diamondsEarned: number;

  creatorEarnings?: CreatorEarningsSummaryDto;

  updatedAt: string;
};

export type SendGiftRequestDto = {
  giftId: string;
  recipientUserId: string;
  idempotencyKey?: string;
  quantity?: number;
};

export type SendGiftResponseDto = {
  ok: true;
  txId: string;
  quantity?: number;
  totalCoinCost?: number;
  totalDiamondValue?: number;
  senderWallet: WalletResponseDto;
};