/**
 * Phase 9 — default gift catalog (dev-friendly).
 * In production you'll likely manage this via an admin panel / CMS.
 */

export type CatalogGift = {
  id: string;
  name: string;
  diamondValue: number;
  coinCost: number;
  mediaUrl: string;
  mediaType: "VIDEO" | "LOTTIE" | "GIF" | "IMAGE";
  isBigGift?: boolean;
};

export const DEFAULT_GIFT_CATALOG: CatalogGift[] = [
  {
    id: "rose",
    name: "Rose",
    diamondValue: 10,
    coinCost: 10,
    mediaUrl: "/gifts/rose.png",
    mediaType: "IMAGE",
  },
  {
    id: "crown_goat",
    name: "Crowned Goat",
    diamondValue: 250,
    coinCost: 250,
    mediaUrl: "/gifts/crowned-goat.gif",
    mediaType: "GIF",
    isBigGift: false,
  },
  {
    id: "dragon_egg",
    name: "Dragon Egg Hatch",
    diamondValue: 5000,
    coinCost: 5000,
    mediaUrl: "/gifts/dragon-egg.mp4",
    mediaType: "VIDEO",
    isBigGift: true,
  },
  {
    id: "galaxy",
    name: "Galaxy",
    diamondValue: 1_000_000,
    coinCost: 1_000_000,
    mediaUrl: "/gifts/galaxy.mp4",
    mediaType: "VIDEO",
    isBigGift: true,
  },
];
