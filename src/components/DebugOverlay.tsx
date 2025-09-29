'use client';

import React, { useState, useEffect } from 'react';
import { useDatabase } from '@/contexts/DatabaseContext';

interface DebugInfo {
  elo: number;
  gameLevel: number;
  timeLimit: number;
  depthLimit: number;
  move: string;
  thinking: boolean;
  timestamp: string;
  setup?: {
    multiPV: number;
    uciLimitStrength: boolean;
    threads: number;
    hash: number;
    thinkingDelay: number;
    moveSelection: string;
  };
}

export default function DebugOverlay() {
  const { gameState, stockfishConfig } = useDatabase();
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [isVisible, setIsVisible] = useState(false); // Start hidden
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Listen for custom debug events
    const handleDebugEvent = (event: CustomEvent) => {
      setDebugInfo(event.detail);
    };

    window.addEventListener('stockfish-debug', handleDebugEvent as EventListener);
    return () => {
      window.removeEventListener('stockfish-debug', handleDebugEvent as EventListener);
    };
  }, []);

  const copyToClipboard = async () => {
    if (!debugInfo) return;
    
    const debugText = `🔧 Stockfish Debug Info:
ELO: ${debugInfo.elo}
Game Level: ${debugInfo.gameLevel}
Time Limit: ${debugInfo.timeLimit}ms
Depth Limit: ${debugInfo.depthLimit}
Move: ${debugInfo.move}
Thinking: ${debugInfo.thinking}
Timestamp: ${debugInfo.timestamp}

📊 Stockfish Setup:
MultiPV: ${debugInfo.setup?.multiPV || 'N/A'}
UCI_LimitStrength: ${debugInfo.setup?.uciLimitStrength ? 'ON' : 'OFF'}
Threads: ${debugInfo.setup?.threads || 'N/A'}
Hash: ${debugInfo.setup?.hash || 'N/A'}
Thinking Delay: ${debugInfo.setup?.thinkingDelay || 'N/A'}ms
Move Selection: ${debugInfo.setup?.moveSelection || 'N/A'}

🎮 Game State:
FEN: ${gameState.fen}
Moves: ${gameState.moves.join(', ')}`;

    try {
      await navigator.clipboard.writeText(debugText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Always show the debug button, but only show overlay when visible and has data
  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed top-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg z-50"
        title="Show Debug Info"
      >
        🐛
      </button>
    );
  }

  if (!debugInfo) return null;

  return (
    <div className="fixed top-4 right-4 bg-black/90 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-bold">🐛 Debug Info</h3>
        <div className="flex gap-2">
          <button
            onClick={copyToClipboard}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
          >
            {copied ? '✅ Copied!' : '📋 Copy'}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
          >
            ✕
          </button>
        </div>
      </div>
      
      <div className="text-xs space-y-1">
        <div><span className="text-yellow-400">ELO:</span> {debugInfo.elo}</div>
        <div><span className="text-yellow-400">Game Level:</span> {debugInfo.gameLevel}</div>
        <div><span className="text-yellow-400">Time:</span> {debugInfo.timeLimit}ms</div>
        <div><span className="text-yellow-400">Depth:</span> {debugInfo.depthLimit}</div>
        <div><span className="text-yellow-400">Move:</span> {debugInfo.move}</div>
        <div><span className="text-yellow-400">Thinking:</span> {debugInfo.thinking ? '🤔' : '✅'}</div>
        <div><span className="text-yellow-400">Time:</span> {debugInfo.timestamp}</div>
        
        {debugInfo.setup && (
          <>
            <div className="border-t border-gray-600 pt-1 mt-2">
              <div className="text-cyan-400 font-semibold text-xs mb-1">Stockfish Setup:</div>
              <div><span className="text-cyan-400">MultiPV:</span> {debugInfo.setup.multiPV}</div>
              <div><span className="text-cyan-400">UCI_LimitStrength:</span> {debugInfo.setup.uciLimitStrength ? 'ON' : 'OFF'}</div>
              <div><span className="text-cyan-400">Threads:</span> {debugInfo.setup.threads}</div>
              <div><span className="text-cyan-400">Hash:</span> {debugInfo.setup.hash}</div>
              <div><span className="text-cyan-400">Delay:</span> {debugInfo.setup.thinkingDelay}ms</div>
              <div><span className="text-cyan-400">Selection:</span> {debugInfo.setup.moveSelection}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
