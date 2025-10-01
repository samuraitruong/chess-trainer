'use client';

import React from 'react';
import { IoInformationCircleOutline } from 'react-icons/io5';
import { LEVELS } from '@/utils/levelConfig';
import { useDatabase } from '@/contexts/DatabaseContext';

interface GameControlsProps {
  onShowMoveIndicatorsChange?: (show: boolean) => void;
}

export default function GameControls({ onShowMoveIndicatorsChange }: GameControlsProps) {
  const { gameState, playerStats, resetGame, startNewGame } = useDatabase();
  const [showMoveIndicators, setShowMoveIndicators] = React.useState(true);
  const [showLevelModal, setShowLevelModal] = React.useState(false);

  // Calculate AI level based on player stats
  const currentElo = playerStats?.current_elo || 100;
  const minElo = 50, maxElo = 2000;
  const fraction = Math.max(0, Math.min(1, (currentElo - minElo) / (maxElo - minElo)));
  const calculatedAiLevel = 1 + Math.floor(fraction * 19);
  const currentAnimal = LEVELS[calculatedAiLevel - 1]?.animalName || 'Chick';



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
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <span>AI Difficulty</span>
            <button
              type="button"
              className="text-gray-500 hover:text-blue-600"
              aria-label="Show level profiles"
              onClick={() => setShowLevelModal(true)}
            >
              <IoInformationCircleOutline />
            </button>
          </h3>
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

        {/* AI Avatar */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Your Opponent</h3>
          <div className="flex flex-col items-center space-y-3">
            <div className="relative">
              <img 
                src={`/ai/set1/${currentAnimal}.png`}
                alt="AI Avatar"
                className="w-24 h-24 object-cover rounded-full border-4 border-blue-300 shadow-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              {gameState.isThinking && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center animate-pulse">
                  <span className="text-xs">🤔</span>
                </div>
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-800">
                Level {calculatedAiLevel}
              </p>
              <p className="text-xs text-gray-600">
                {gameState.isPlayerTurn ? 'Your Turn' : 'AI Thinking...'}
              </p>
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
      {showLevelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowLevelModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Level Profiles</h3>
              <button
                type="button"
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
                onClick={() => setShowLevelModal(false)}
              >
                ✕
              </button>
            </div>
            {(() => {
              const elo = playerStats?.current_elo || 50;
              const minElo = 50, maxElo = 2000;
              const fraction = Math.max(0, Math.min(1, (elo - minElo) / (maxElo - minElo)));
              const currentLevel = 1 + Math.floor(fraction * 19);
              return (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {LEVELS.map(lp => (
                    <div
                      key={lp.level}
                      className={`p-2 rounded border text-xs font-semibold ${lp.level <= currentLevel ? 'opacity-100 border-green-200 bg-green-50 text-green-800' : 'opacity-50 border-gray-200 bg-gray-50 text-gray-600'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col">
                          <span>Lv {lp.level}</span>
                          <div className="text-[10px] text-gray-500">
                            {lp.description.split(' (~')[0]}
                          </div>
                          <div className="text-[9px] text-gray-400">
                            {lp.description.match(/\(~(\d+) Elo\)/)?.[1] ? `~${lp.description.match(/\(~(\d+) Elo\)/)?.[1]} Elo` : ''}
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <img 
                            src={`/ai/set1/${lp.animalName}.png`}
                            alt={lp.animalName}
                            className="w-16 h-16 object-cover rounded-full border-2 border-gray-300"
                            onError={(e) => {
                              // Hide image if it fails to load
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <span className="text-xs">{lp.animalName}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
            <div className="mt-3 text-right">
              <button
                type="button"
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                onClick={() => setShowLevelModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
