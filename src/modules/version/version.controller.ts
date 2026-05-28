import { Body, Controller, Get, Post } from "@nestjs/common";
import { readFileSync } from "fs";
import { join } from "path";

type VersionResponse = {
  name: string;
  version: string;
  commit: string | null;
  builtAt: string | null;
};

type MobilePlatform = "ios" | "android" | "web" | "unknown";
type VersionCheckStatus = "ok" | "recommended" | "required";

type VersionCheckRequest = {
  platform?: string | null;
  version?: string | null;
  nativeApplicationVersion?: string | null;
  buildNumber?: string | number | null;
  nativeBuildVersion?: string | number | null;
  applicationId?: string | null;
};

type VersionCheckResponse = {
  status: VersionCheckStatus;
  updateRequired: boolean;
  updateRecommended: boolean;
  platform: MobilePlatform;
  currentVersion: string | null;
  currentBuild: number;
  minimumSupportedBuild: number | null;
  latestBuild: number | null;
  title: string;
  message: string;
  storeUrl: string | null;
};

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizePlatform(value: unknown): MobilePlatform {
  const cleaned = cleanString(value)?.toLowerCase();

  if (cleaned === "ios") return "ios";
  if (cleaned === "android") return "android";
  if (cleaned === "web") return "web";

  return "unknown";
}

function parseBuild(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }

  const cleaned = cleanString(value);
  if (!cleaned) return 0;

  const parsed = Number.parseInt(cleaned, 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function envInt(name: string, fallback = 0): number {
  const parsed = parseBuild(process.env[name]);
  return parsed > 0 ? parsed : fallback;
}

function envText(name: string): string | null {
  return cleanString(process.env[name]);
}

function platformPrefix(platform: MobilePlatform): "MOBILE_IOS" | "MOBILE_ANDROID" | null {
  if (platform === "ios") return "MOBILE_IOS";
  if (platform === "android") return "MOBILE_ANDROID";
  return null;
}

@Controller()
export class VersionController {
  @Get("/version")
  version(): VersionResponse {
    const name = process.env.APP_NAME || "liveapp-api";

    let version = "0.0.0";
    try {
      const pkgPath = join(process.cwd(), "package.json");
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as { version?: string };
      version = pkg.version || version;
    } catch {
      // ignore
    }

    const commit = (process.env.GIT_COMMIT || "").trim() || null;
    const builtAt = (process.env.BUILT_AT || "").trim() || null;

    return { name, version, commit, builtAt };
  }

  @Post("/version/check")
  checkMobileVersion(@Body() body?: VersionCheckRequest): VersionCheckResponse {
    const appName = envText("APP_NAME") ?? "SparkzLive";
    const platform = normalizePlatform(body?.platform);
    const prefix = platformPrefix(platform);

    const currentVersion =
      cleanString(body?.version) ??
      cleanString(body?.nativeApplicationVersion);

    const currentBuild = parseBuild(
      body?.buildNumber ?? body?.nativeBuildVersion,
    );

    const minimumSupportedBuild = prefix
      ? envInt(`${prefix}_MIN_BUILD`, 0)
      : 0;
    const configuredLatestBuild = prefix
      ? envInt(`${prefix}_LATEST_BUILD`, 0)
      : 0;
    const latestBuild = Math.max(configuredLatestBuild, minimumSupportedBuild);

    let status: VersionCheckStatus = "ok";

    if (
      prefix &&
      currentBuild > 0 &&
      minimumSupportedBuild > 0 &&
      currentBuild < minimumSupportedBuild
    ) {
      status = "required";
    } else if (
      prefix &&
      currentBuild > 0 &&
      latestBuild > 0 &&
      currentBuild < latestBuild
    ) {
      status = "recommended";
    }

    const updateRequired = status === "required";
    const updateRecommended = status === "recommended";

    const fallbackStoreUrl = envText("APP_WEB_URL") ?? "https://sparkzlive.com";
    const storeUrl = prefix
      ? envText(`${prefix}_STORE_URL`) ?? fallbackStoreUrl
      : fallbackStoreUrl;

    const title = updateRequired
      ? envText("MOBILE_UPDATE_REQUIRED_TITLE") ?? "Update required"
      : updateRecommended
        ? envText("MOBILE_UPDATE_RECOMMENDED_TITLE") ?? "Update available"
        : "App version OK";

    const message = updateRequired
      ? envText("MOBILE_UPDATE_REQUIRED_MESSAGE") ??
        `This version of ${appName} is outdated. Please update to continue.`
      : updateRecommended
        ? envText("MOBILE_UPDATE_RECOMMENDED_MESSAGE") ??
          `A newer version of ${appName} is available.`
        : "Your app is up to date.";

    return {
      status,
      updateRequired,
      updateRecommended,
      platform,
      currentVersion,
      currentBuild,
      minimumSupportedBuild: minimumSupportedBuild > 0 ? minimumSupportedBuild : null,
      latestBuild: latestBuild > 0 ? latestBuild : null,
      title,
      message,
      storeUrl,
    };
  }
}
