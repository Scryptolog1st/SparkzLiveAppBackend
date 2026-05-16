import { Controller, Get } from "@nestjs/common";
import { readFileSync } from "fs";
import { join } from "path";

type VersionResponse = {
  name: string;
  version: string;
  commit: string | null;
  builtAt: string | null;
};

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
}
