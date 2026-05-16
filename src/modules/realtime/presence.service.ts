import { Injectable } from "@nestjs/common";

@Injectable()
export class PresenceService {
  // streamId -> set of socketIds
  private readonly streamSockets = new Map<string, Set<string>>();
  // socketId -> streamId
  private readonly socketToStream = new Map<string, string>();

  join(streamId: string, socketId: string) {
    // leave previous if any
    const prev = this.socketToStream.get(socketId);
    if (prev && prev !== streamId) {
      this.leave(prev, socketId);
    }

    let set = this.streamSockets.get(streamId);
    if (!set) {
      set = new Set<string>();
      this.streamSockets.set(streamId, set);
    }
    set.add(socketId);
    this.socketToStream.set(socketId, streamId);
  }

  leave(streamId: string, socketId: string) {
    const set = this.streamSockets.get(streamId);
    if (set) {
      set.delete(socketId);
      if (set.size === 0) this.streamSockets.delete(streamId);
    }
    this.socketToStream.delete(socketId);
  }

  leaveBySocket(socketId: string) {
    const streamId = this.socketToStream.get(socketId);
    if (streamId) {
      this.leave(streamId, socketId);
      return streamId;
    }
    return null;
  }

  count(streamId: string): number {
    return this.streamSockets.get(streamId)?.size ?? 0;
  }
}
