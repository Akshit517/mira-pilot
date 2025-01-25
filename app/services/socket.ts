'use client';

import { io, Socket } from 'socket.io-client';

class SocketService {
  private static instance: SocketService;
  private socket: Socket | null = null;

  private constructor() {}

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  async connect(roomId: string): Promise<Socket> {
    if (!this.socket) {
      try {
        // Connect to the standalone socket server
        this.socket = io('http://localhost:3001', {
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          forceNew: true
        });

        this.socket.on('connect', () => {
          console.log('Connected to socket server');
          this.socket?.emit('join-room', roomId);
        });

        this.socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
        });

        this.socket.on('reconnect', (attemptNumber) => {
          console.log('Reconnected after', attemptNumber, 'attempts');
          this.socket?.emit('join-room', roomId);
        });

        this.socket.on('disconnect', () => {
          console.log('Disconnected from socket server');
        });

      } catch (error) {
        console.error('Failed to initialize socket connection:', error);
        throw error;
      }
    }

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export default SocketService;
