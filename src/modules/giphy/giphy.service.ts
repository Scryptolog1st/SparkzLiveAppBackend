import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

type GiphyImageInput = {
  url?: unknown;
  webp?: unknown;
  mp4?: unknown;
  width?: unknown;
  height?: unknown;
  size?: unknown;
};

type GiphyApiItem = {
  id?: unknown;
  title?: unknown;
  url?: unknown;
  bitly_url?: unknown;
  rating?: unknown;
  images?: Record<string, GiphyImageInput | undefined>;
};

type GiphyApiResponse = {
  data?: GiphyApiItem[];
  pagination?: {
    total_count?: unknown;
    count?: unknown;
    offset?: unknown;
  };
  meta?: {
    status?: unknown;
    msg?: unknown;
    response_id?: unknown;
  };
};

export type GiphyProxyItem = {
  id: string;
  title: string;
  rating: string | null;
  url: string | null;
  previewUrl: string | null;
  previewWidth: number | null;
  previewHeight: number | null;
  originalUrl: string | null;
  originalWidth: number | null;
  originalHeight: number | null;
  webpUrl: string | null;
  mp4Url: string | null;
};

const GIPHY_API_BASE_URL = "https://api.giphy.com/v1/gifs";
const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 40;
const DEFAULT_RATING = "pg-13";
const ALLOWED_RATINGS = new Set(["g", "pg", "pg-13"]);

@Injectable()
export class GiphyService {
  constructor(private readonly config: ConfigService) {}

  async trending(options: { limit?: string; offset?: string; rating?: string }) {
    const url = this.buildGiphyUrl("/trending", {
      limit: this.normalizeLimit(options.limit, DEFAULT_LIMIT),
      offset: this.normalizeOffset(options.offset),
      rating: this.normalizeRating(options.rating),
    });

    return this.fetchGiphy(url);
  }

  async search(options: { q?: string; limit?: string; offset?: string; rating?: string }) {
    const query = this.normalizeSearchQuery(options.q);

    const url = this.buildGiphyUrl("/search", {
      q: query,
      limit: this.normalizeLimit(options.limit, DEFAULT_LIMIT),
      offset: this.normalizeOffset(options.offset),
      rating: this.normalizeRating(options.rating),
      lang: "en",
    });

    return this.fetchGiphy(url);
  }

  private getApiKey() {
    const key = String(
      this.config.get<string>("GIPHY_API_KEY") || process.env.GIPHY_API_KEY || "",
    ).trim();

    if (!key) {
      throw new ServiceUnavailableException("GIF search is not configured.");
    }

    return key;
  }

  private buildGiphyUrl(path: string, params: Record<string, string | number>) {
    const url = new URL(`${GIPHY_API_BASE_URL}${path}`);
    url.searchParams.set("api_key", this.getApiKey());

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }

    return url;
  }

  private async fetchGiphy(url: URL) {
    let response: Response;

    try {
      response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });
    } catch (error) {
      throw new BadGatewayException("GIF provider is currently unreachable.");
    }

    if (!response.ok) {
      throw new BadGatewayException("GIF provider request failed.");
    }

    let payload: GiphyApiResponse;

    try {
      payload = (await response.json()) as GiphyApiResponse;
    } catch (error) {
      throw new BadGatewayException("GIF provider returned an invalid response.");
    }

    const items = Array.isArray(payload.data)
      ? payload.data.map((item) => this.mapGiphyItem(item)).filter(Boolean)
      : [];

    return {
      provider: "giphy",
      items,
      pagination: {
        totalCount: this.toNullableNumber(payload.pagination?.total_count),
        count: this.toNullableNumber(payload.pagination?.count),
        offset: this.toNullableNumber(payload.pagination?.offset),
      },
      meta: {
        status: this.toNullableNumber(payload.meta?.status),
        message: this.toNullableString(payload.meta?.msg),
        responseId: this.toNullableString(payload.meta?.response_id),
      },
    };
  }

  private normalizeSearchQuery(value?: string) {
    const query = String(value || "").trim().replace(/\s+/g, " ");

    if (query.length < 2) {
      throw new BadRequestException("GIF search query must be at least 2 characters.");
    }

    return query.slice(0, 80);
  }

  private normalizeLimit(value: unknown, fallback: number) {
    const parsed = Number(value);
    const limit = Number.isFinite(parsed) ? Math.floor(parsed) : fallback;
    return Math.max(1, Math.min(MAX_LIMIT, limit));
  }

  private normalizeOffset(value: unknown) {
    const parsed = Number(value);
    const offset = Number.isFinite(parsed) ? Math.floor(parsed) : 0;
    return Math.max(0, Math.min(5000, offset));
  }

  private normalizeRating(value: unknown) {
    const rating = String(value || DEFAULT_RATING).trim().toLowerCase();

    if (!ALLOWED_RATINGS.has(rating)) {
      return DEFAULT_RATING;
    }

    return rating;
  }

  private mapGiphyItem(item: GiphyApiItem): GiphyProxyItem | null {
    const id = this.toNullableString(item.id);

    if (!id) {
      return null;
    }

    const images = item.images || {};
    const preview =
      images.fixed_width_small ||
      images.fixed_height_small ||
      images.downsized ||
      images.downsized_medium ||
      images.original;
    const original = images.original || preview;

    return {
      id,
      title: this.toNullableString(item.title) || "GIF",
      rating: this.toNullableString(item.rating),
      url: this.toNullableString(item.url) || this.toNullableString(item.bitly_url),
      previewUrl:
        this.toNullableString(preview?.webp) ||
        this.toNullableString(preview?.url) ||
        this.toNullableString(original?.webp) ||
        this.toNullableString(original?.url),
      previewWidth: this.toNullableNumber(preview?.width),
      previewHeight: this.toNullableNumber(preview?.height),
      originalUrl:
        this.toNullableString(original?.webp) ||
        this.toNullableString(original?.url) ||
        this.toNullableString(preview?.webp) ||
        this.toNullableString(preview?.url),
      originalWidth: this.toNullableNumber(original?.width),
      originalHeight: this.toNullableNumber(original?.height),
      webpUrl: this.toNullableString(original?.webp) || this.toNullableString(preview?.webp),
      mp4Url: this.toNullableString(original?.mp4) || this.toNullableString(preview?.mp4),
    };
  }

  private toNullableString(value: unknown) {
    const text = String(value ?? "").trim();
    return text || null;
  }

  private toNullableNumber(value: unknown) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
