export type VideoProvider = "LIVEKIT";

export type VideoRole = "HOST" | "GUEST" | "MODERATOR" | "VIEWER";

export type VideoTokenResponse = {
  token: string;
  url: string;
  roomName: string;
  provider: VideoProvider;
};
