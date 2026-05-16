import { AccessToken } from "livekit-server-sdk";
import type { VideoProviderAdapter } from "./video-provider.adapter";
import type { VideoRole, VideoTokenResponse } from "../video.types";
import { ServiceUnavailableException } from "@nestjs/common";

export class LiveKitAdapter implements VideoProviderAdapter {
  readonly providerName = "LIVEKIT" as const;

  constructor(
    private readonly url: string,
    private readonly apiKey: string,
    private readonly apiSecret: string,
  ) {}

  async getToken(params: {
    streamId: string;
    userId: string;
    identity: string;
    role: VideoRole;
    roomName: string;
  }): Promise<VideoTokenResponse> {
    const { identity, role, roomName } = params;

    if (!this.url || !this.apiKey || !this.apiSecret) {
      throw new ServiceUnavailableException("LiveKit is not configured");
    }

    const canPublish = role === "HOST" || role === "GUEST" || role === "MODERATOR";

    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity,
      name: identity,
      metadata: JSON.stringify({ role, userId: params.userId, streamId: params.streamId }),
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish,
      canSubscribe: true,
      canPublishData: canPublish,
    });

    const token = await at.toJwt();

    return {
      token,
      url: this.url,
      roomName,
      provider: "LIVEKIT",
    };
  }
}
