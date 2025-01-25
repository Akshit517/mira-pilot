'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Editor from '@monaco-editor/react';
import SocketService from '@/app/services/socket';
import { Socket } from 'socket.io-client';

export default function Room() {
  const params = useParams();
  const roomId = params.roomId as string;
  const [code, setCode] = useState('// Start coding here...');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userCount, setUserCount] = useState<number>(1);

  // Initialize socket connection
  useEffect(() => {
    const initSocket = async () => {
      try {
        const socketService = SocketService.getInstance();
        const socket = await socketService.connect(roomId);
        setSocket(socket);

        // Listen for code updates from other clients
        socket.on('code-update', (newCode: string) => {
          console.log('Received code update');
          setCode(newCode);
        });

        // Listen for initial code sync when joining room
        socket.on('sync-code', (syncedCode: string) => {
          console.log('Received initial code sync');
          setCode(syncedCode);
        });

        // Listen for user count updates
        socket.on('user-count', (count: number) => {
          console.log('User count updated:', count);
          setUserCount(count);
        });

        return () => {
          socketService.disconnect();
        };
      } catch (err) {
        console.error('Socket initialization error:', err);
        setError('Failed to connect to the collaboration server');
      }
    };

    initSocket();
  }, [roomId]);

  // Handle local code changes
  const handleCodeChange = (value: string | undefined) => {
    if (!value || !socket) return;
    
    setCode(value);
    socket.emit('code-update', { roomId, code: value });
  };

  if (error) {
    return (
      <div className="container" style={{ padding: '2rem' }}>
        <div className="card" style={{ textAlign: 'center', color: '#ef4444' }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ height: '100vh', padding: '1rem' }}>
      <div className="editor-container" style={{ height: 'calc(100vh - 2rem)' }}>
        <div className="editor-header">
          <div className="room-info">
            <span className="room-id">Room: {roomId}</span>
            <div className="user-count">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              {userCount} {userCount === 1 ? 'user' : 'users'} connected
            </div>
          </div>
        </div>
        <Editor
          height="calc(100% - 60px)"
          language="javascript"
          value={code}
          onChange={handleCodeChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 16,
            wordWrap: 'on',
            automaticLayout: true,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            tabSize: 2,
            padding: { top: 16, bottom: 16 },
          }}
        />
      </div>
    </div>
  );
}
