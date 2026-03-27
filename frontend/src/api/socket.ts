import { io, type Socket } from 'socket.io-client';
import { getUserEntityId } from '../types';

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

export function joinChannel(channelId: string): void {
  const s = getSocket();
  // "1" is SOCKET_MESSAGE_TYPE.ROOM_JOINING
  s.emit('1', {
    channelId,
    entityId: getUserEntityId(),
  });
}

export function onMessageBroadcast(callback: (data: any) => void): () => void {
  const s = getSocket();
  s.on('messageBroadcast', callback);
  return () => s.off('messageBroadcast', callback);
}

export function onStreamChunk(callback: (data: any) => void): () => void {
  const s = getSocket();
  s.on('messageStreamChunk', callback);
  return () => s.off('messageStreamChunk', callback);
}
