'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Editor from '@monaco-editor/react';
import SocketService from '@/app/services/socket';
import { CompletionService } from '@/app/services/completion';
import { Socket } from 'socket.io-client';
import '@/app/lib/monaco';  // Import Monaco configuration

export default function Room() {
  const params = useParams();
  const roomId = params.roomId as string;
  const [code, setCode] = useState('// Start coding here...');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userCount, setUserCount] = useState<number>(1);
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const [monacoInstance, setMonacoInstance] = useState<any>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  // Initialize socket connection
  useEffect(() => {
    const initSocket = async () => {
      try {
        const socketService = SocketService.getInstance();
        const socket = await socketService.connect(roomId);
        setSocket(socket);

        socket.on('code-update', (newCode: string) => {
          console.log('Received code update');
          setCode(newCode);
        });

        socket.on('sync-code', (syncedCode: string) => {
          console.log('Received initial code sync');
          setCode(syncedCode);
        });

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

  // Handle code completion
  const handleCompletion = async () => {
    if (!editorInstance || !monacoInstance) {
      console.error('Editor not initialized');
      return;
    }

    try {
      const model = editorInstance.getModel();
      const position = editorInstance.getPosition();

      if (!model || !position) {
        console.error('Could not get editor model or position');
        return;
      }

      console.log('Current position:', position);

      const wordAtPosition = model.getWordUntilPosition(position);
      console.log('Word at position:', wordAtPosition);

      const lineContent = model.getLineContent(position.lineNumber);
      console.log('Line content:', lineContent);

      // Get more context by including previous lines
      const contextLines = 3;
      const startLine = Math.max(1, position.lineNumber - contextLines);
      let codeContext = '';

      for (let i = startLine; i <= position.lineNumber; i++) {
        codeContext += model.getLineContent(i) + '\n';
      }

      console.log('Code context:', codeContext);

      // Get completion
      const completionService = CompletionService.getInstance();
      const response = await completionService.getCompletion(codeContext, 'typescript');

      // Parse the response to get the explanation
      try {
        const data = JSON.parse(response);
        setSuggestion(data.result || 'No suggestion available');
      } catch (e) {
        setSuggestion(response);
      }

    } catch (err) {
      console.error('Error getting completion:', err);
      setSuggestion('Error getting suggestion');
    }
  };

  // Handle editor initialization
  const handleEditorDidMount = (editor: any, monaco: any) => {
    setEditorInstance(editor);
    setMonacoInstance(monaco);

    // Add command for code completion
    editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.Space, handleCompletion);
  };

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
      <div className="editor-container" style={{ height: 'calc(100vh - 2rem)', display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ fontSize: '0.875rem', opacity: 0.7 }}>
                Press Shift+Space for AI code completion
              </div>
              <button
                onClick={handleCompletion}
                className="btn btn-primary"
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
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
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                Get Suggestions
              </button>
            </div>
          </div>
          <Editor
            defaultLanguage="typescript"
            defaultValue={code}
            value={code}
            onChange={handleCodeChange}
            onMount={handleEditorDidMount}
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
              suggestOnTriggerCharacters: true,
            }}
            loading={<div>Loading editor...</div>}
            beforeMount={(monaco) => {
              monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
                target: monaco.languages.typescript.ScriptTarget.Latest,
                allowNonTsExtensions: true,
                moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
                module: monaco.languages.typescript.ModuleKind.CommonJS,
                noEmit: true,
                esModuleInterop: true,
                jsx: monaco.languages.typescript.JsxEmit.React,
                reactNamespace: "React",
                allowJs: true,
                typeRoots: ["node_modules/@types"]
              });
            }}
          />
        </div>
        {suggestion && (
          <div
            style={{
              width: '300px',
              backgroundColor: '#1e1e1e',
              padding: '1rem',
              borderRadius: '0.5rem',
              overflowY: 'auto'
            }}
          >
            <div style={{
              marginBottom: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>AI Suggestion</h3>
              <button
                onClick={() => setSuggestion(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#666',
                  cursor: 'pointer',
                  padding: '0.25rem'
                }}
              >
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
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div style={{
              whiteSpace: 'pre-wrap',
              fontSize: '0.875rem',
              lineHeight: '1.5',
              color: '#d4d4d4'
            }}>
              {suggestion}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}