export type VideoProvider = "LIVEKIT";

export type VideoRole = "HOST" | "GUEST" | "MODERATOR" | "VIEWER";

export type StreamTokenJoinMode = "publisher" | "owner_viewer" | "viewer";

export type VideoActivePublisher = {
  userId: string | null;
  deviceSessionId: string | null;
  participantIdentity: string | null;
  sessionId: string | null;
  tokenVersion: number;
  transferredAt: string | null;
};

export type VideoTokenResponse = {
  token: string;
  url: string;
  roomName: string;
  provider: VideoProvider;
  identity?: string;
  role?: VideoRole;
  canPublish?: boolean;
  canPublishData?: boolean;
  joinMode?: StreamTokenJoinMode;
  isStreamOwner?: boolean;
  ownerPromptRequired?: boolean;
  activePublisher?: VideoActivePublisher | null;
};
