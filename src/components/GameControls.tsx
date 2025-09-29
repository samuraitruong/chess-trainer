'use client';

import React from 'react';
import { useDatabase } from '@/contexts/DatabaseContext';

interface GameControlsProps {
  onShowMoveIndicatorsChange?: (show: boolean) => void;
}

export default function GameControls({ onShowMoveIndicatorsChange }: GameControlsProps) {
  const { gameState, playerStats, resetGame, startNewGame } = useDatabase();
  const [showMoveIndicators, setShowMoveIndicators] = React.useState(true);

  const handleShowMoveIndicatorsChange = (show: boolean) => {
    setShowMoveIndicators(show);
    onShowMoveIndicatorsChange?.(show);
  };

  const handleNewGame = () => {
    startNewGame();
  };

  const handleReset = () => {
    resetGame();
  };


  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Game Controls */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Game Controls</h3>
          <div className="space-y-2">
            <button
              onClick={handleNewGame}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              New Game
            </button>
            <button
              onClick={handleReset}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Reset Board
            </button>
          </div>
        </div>

        {/* AI Difficulty - Read Only */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">AI Difficulty</h3>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Current Elo: {playerStats?.current_elo || 0}
            </label>
            <div className="w-full h-2 bg-gray-200 rounded-lg">
              <div 
                className="h-2 bg-blue-500 rounded-lg transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, ((playerStats?.current_elo || 0) - 50) / (2000 - 50)) * 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>50 (Beginner)</span>
              <span>2000 (Master)</span>
            </div>
            <p className="text-xs text-gray-600">
              ELO changes automatically based on your performance
            </p>
          </div>
        </div>

        {/* Game Status */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Game Status</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Turn:</span>
              <span className={`text-sm font-medium ${gameState.isPlayerTurn ? 'text-green-600' : 'text-blue-600'}`}>
                {gameState.isPlayerTurn ? 'Your Turn' : 'AI Turn'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Moves:</span>
              <span className="text-sm font-medium">{gameState.moves.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Status:</span>
              <span className={`text-sm font-medium ${
                gameState.isGameOver 
                  ? gameState.result === 'white' 
                    ? 'text-green-600' 
                    : gameState.result === 'black' 
                    ? 'text-red-600' 
                    : 'text-yellow-600'
                  : 'text-gray-600'
              }`}>
                {gameState.isGameOver 
                  ? gameState.result === 'white' 
                    ? 'You Won!' 
                    : gameState.result === 'black' 
                    ? 'AI Won!' 
                    : 'Draw!'
                  : 'Playing'
                }
              </span>
            </div>
          </div>
        </div>

        {/* Display Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Display Settings</h3>
          <div className="space-y-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showMoveIndicators}
                onChange={(e) => handleShowMoveIndicatorsChange(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Show move indicators</span>
            </label>
            <p className="text-xs text-gray-500">
              Toggle the green circles that show legal moves
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
