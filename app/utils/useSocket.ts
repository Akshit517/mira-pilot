'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket(roomId: string | string[]) {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!roomId) return;

    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
      path: '/api/socket/io',
      addTrailingSlash: false,
    });

    newSocket.emit('join-room', roomId);
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [roomId]);

  const emitCodeChange = (code: string) => {
    if (socket) {
      socket.emit('code-change', { roomId, code });
    }
  };

  const emitLanguageChange = (language: string) => {
    if (socket) {
      socket.emit('language-change', { roomId, language });
    }
  };

  return {
    socket,
    emitCodeChange,
    emitLanguageChange,
  };
}
