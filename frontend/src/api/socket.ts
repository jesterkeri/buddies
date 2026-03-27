import { io, type Socket } from 'socket.io-client';
import { getUserEntityId } from '../types';

// ElizaOS socket event types (from SOCKET_MESSAGE_TYPE enum in server)
const SOCKET_EVENTS = {
  ROOM_JOINING: '1',
  SEND_MESSAGE: '2',
  MESSAGE_BROADCAST: 'messageBroadcast',
  STREAM_CHUNK: 'messageStreamChunk',
  STREAM_ERROR: 'messageStreamError',
} as const;

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(window.location.origin, {
      auth: {
        entityId: getUserEntityId(),
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
      console.log('[Buddies] Socket connected');
      // Rejoin channels on reconnect
      pendingChannels.forEach((channelId) => joinChannel(channelId));
    });

    socket.on('disconnect', (reason) => {
      console.log('[Buddies] Socket disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('[Buddies] Socket connection error:', err.message);
    });
  }
  return socket;
}

// Track joined channels for reconnection
const pendingChannels = new Set<string>();

export function joinChannel(channelId: string): void {
  const s = getSocket();
  pendingChannels.add(channelId);
  s.emit(SOCKET_EVENTS.ROOM_JOINING, {
    channelId,
    entityId: getUserEntityId(),
  });
}

export function onMessageBroadcast(callback: (data: any) => void): () => void {
  const s = getSocket();
  s.on(SOCKET_EVENTS.MESSAGE_BROADCAST, callback);
  return () => s.off(SOCKET_EVENTS.MESSAGE_BROADCAST, callback);
}

export function onStreamChunk(callback: (data: any) => void): () => void {
  const s = getSocket();
  s.on(SOCKET_EVENTS.STREAM_CHUNK, callback);
  return () => s.off(SOCKET_EVENTS.STREAM_CHUNK, callback);
}
