import { Body, Controller, Param, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt/jwt-auth.guard";
import { VideoService } from "./video.service";

type JwtReq = Request & {
  user?: {
    userId: string;
    username?: string;
  };
};

@Controller()
export class VideoController {
  constructor(private readonly video: VideoService) { }

  @UseGuards(JwtAuthGuard)
  @Post("/streams/:id/videoToken")
  async videoToken(
    @Req() req: JwtReq,
    @Param("id") id: string,
    @Body()
    body: {
      deviceSessionId?: string;
      joinMode?: "publisher" | "owner_viewer" | "viewer";
      takeover?: boolean;
    } = {},
  ) {
    return this.video.issueStreamToken({
      streamId: id,
      userId: req.user!.userId,
      deviceSessionId: body?.deviceSessionId,
      joinMode: body?.joinMode,
      takeover: body?.takeover === true,
    });
  }
  @UseGuards(JwtAuthGuard)
  @Post("/battle-sessions/:id/videoToken")
  async battleSessionVideoToken(@Req() req: JwtReq, @Param("id") id: string) {
    return this.video.issueBattleSessionToken({
      battleSessionId: id,
      userId: req.user!.userId,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post("/battle-sessions/:id/opponent-stream-videoToken")
  async battleOpponentStreamVideoToken(
    @Req() req: JwtReq,
    @Param("id") id: string,
    @Body() body: { streamId?: string; targetStreamId?: string },
  ) {
    return this.video.issueBattleOpponentStreamToken({
      battleSessionId: id,
      targetStreamId: body?.targetStreamId || body?.streamId || "",
      userId: req.user!.userId,
    });
  }


}
