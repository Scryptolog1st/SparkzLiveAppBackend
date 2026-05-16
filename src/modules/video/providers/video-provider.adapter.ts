import type { VideoRole, VideoTokenResponse } from "../video.types";

export interface VideoProviderAdapter {
  readonly providerName: "LIVEKIT";
  getToken(params: {
    streamId: string;
    userId: string;
    identity: string; // unique per user
    role: VideoRole;
    roomName: string;
  }): Promise<VideoTokenResponse>;
}
