'use client';

import React, { useEffect, useRef } from 'react';
import { useDatabase } from '@/contexts/DatabaseContext';

export default function MovePanel() {
  const { gameState } = useDatabase();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Group moves into pairs (white and black moves)
  const movePairs = [];
  for (let i = 0; i < gameState.moves.length; i += 2) {
    const whiteMove = gameState.moves[i];
    const blackMove = gameState.moves[i + 1] || null;
    movePairs.push({
      moveNumber: Math.floor(i / 2) + 1,
      whiteMove,
      blackMove,
    });
  }

  // Auto-scroll to bottom when new moves are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [gameState.moves.length]);

  return (
    <div className="w-full h-full bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Game Moves</h3>
      
      <div ref={scrollRef} className="space-y-1 max-h-96 overflow-y-auto">
        {movePairs.map((pair, index) => (
          <div key={index} className="flex items-center space-x-2 py-1 hover:bg-gray-50 rounded">
            <span className="text-sm font-medium text-black w-8">
              {pair.moveNumber}.
            </span>
            
            <div className="flex-1 flex space-x-2">
              {/* White move */}
              <div className="bg-white border border-gray-300 rounded px-2 py-1 text-sm font-mono min-w-0 flex-1 text-center text-black">
                {pair.whiteMove}
              </div>
              
              {/* Black move */}
              <div className="bg-gray-100 border border-gray-300 rounded px-2 py-1 text-sm font-mono min-w-0 flex-1 text-center text-black">
                {pair.blackMove || '...'}
              </div>
            </div>
          </div>
        ))}
        
        {gameState.moves.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">No moves yet</p>
            <p className="text-xs text-gray-400 mt-1">Start playing to see moves here</p>
          </div>
        )}
      </div>
      
      {/* Game status */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Total moves:</span>
            <span className="font-medium">{gameState.moves.length}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>Status:</span>
            <span className={`font-medium ${
              gameState.isGameOver 
                ? gameState.result === 'white' 
                  ? 'text-green-600' 
                  : gameState.result === 'black' 
                  ? 'text-red-600' 
                  : 'text-yellow-600'
                : 'text-blue-600'
            }`}>
              {gameState.isGameOver 
                ? gameState.result === 'white' 
                  ? 'White wins' 
                  : gameState.result === 'black' 
                  ? 'Black wins' 
                  : 'Draw'
                : 'Playing'
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
