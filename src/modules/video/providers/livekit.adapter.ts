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
    canPublish?: boolean;
    canPublishData?: boolean;
    metadata?: Record<string, unknown>;
  }): Promise<VideoTokenResponse> {
    const { identity, role, roomName } = params;

    if (!this.url || !this.apiKey || !this.apiSecret) {
      throw new ServiceUnavailableException("LiveKit is not configured");
    }

    const canPublish =
      typeof params.canPublish === "boolean"
        ? params.canPublish
        : role === "HOST" || role === "GUEST" || role === "MODERATOR";

    const canPublishData =
      typeof params.canPublishData === "boolean" ? params.canPublishData : canPublish;

    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity,
      name: identity,
      metadata: JSON.stringify({
        role,
        userId: params.userId,
        streamId: params.streamId,
        ...(params.metadata ?? {}),
      }),
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish,
      canSubscribe: true,
      canPublishData,
    });

    const token = await at.toJwt();

    return {
      token,
      url: this.url,
      roomName,
      provider: "LIVEKIT",
      identity,
      role,
      canPublish,
      canPublishData,
    };
  }
}
