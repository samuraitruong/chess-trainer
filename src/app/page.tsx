'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { FaChessKnight } from 'react-icons/fa';
import { DatabaseProvider, useDatabase } from '@/contexts/DatabaseContext';
import SimpleChessBoard from '@/components/SimpleChessBoard';
import GameControls from '@/components/GameControls';
import GameReview from '@/components/GameReview';
import MovePanel from '@/components/MovePanel';
import DebugOverlay from '@/components/DebugOverlay';

function CollapsibleGameControls({ 
  isCollapsed, 
  onToggle, 
  showMoveIndicators, 
  onShowMoveIndicatorsChange 
}: { 
  isCollapsed: boolean; 
  onToggle: () => void;
  showMoveIndicators: boolean;
  onShowMoveIndicatorsChange: (show: boolean) => void;
}) {
  const { resetGame, startNewGame } = useDatabase();

  const handleNewGame = () => {
    startNewGame();
  };

  const handleReset = () => {
    resetGame();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-center space-x-4">
          <h2 
            className="text-lg font-semibold text-gray-800 cursor-pointer"
            onClick={onToggle}
          >
            Game Settings
          </h2>
          
          {isCollapsed && (
            <div className="flex items-center space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNewGame();
                }}
                className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
              >
                New Game
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleReset();
                }}
                className="px-3 py-1 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors"
              >
                Reset
              </button>
            </div>
          )}
        </div>
        
        <div 
          className="flex items-center space-x-2 cursor-pointer"
          onClick={onToggle}
        >
          <span className="text-sm text-gray-500">
            {isCollapsed ? 'Click to expand' : 'Click to collapse'}
          </span>
          <svg 
            className={`w-5 h-5 text-gray-500 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      
        {!isCollapsed && (
          <div className="border-t">
            <GameControls onShowMoveIndicatorsChange={onShowMoveIndicatorsChange} />
          </div>
        )}
    </div>
  );
}

function ChessTrainerApp() {
  const [showReview, setShowReview] = useState(false);
  const [isControlsCollapsed, setIsControlsCollapsed] = useState(false);
  const [showMoveIndicators, setShowMoveIndicators] = useState(true);
  const { gameState } = useDatabase();

  return (
    <DatabaseProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center space-x-2">
                  <FaChessKnight className="text-gray-900" />
                  <h1 className="text-2xl font-bold text-gray-900">Chess Trainer</h1>
                </div>
              </div>
              <nav className="flex space-x-8">
                <Link href="/" className="px-3 py-2 rounded-md text-sm font-medium transition-colors bg-blue-100 text-blue-700">Play</Link>
                <Link href="/dashboard" className="px-3 py-2 rounded-md text-sm font-medium transition-colors text-gray-500 hover:text-gray-700">Dashboard</Link>
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            {/* Collapsible Game Controls */}
            <CollapsibleGameControls 
              isCollapsed={isControlsCollapsed}
              onToggle={() => setIsControlsCollapsed(!isControlsCollapsed)}
              showMoveIndicators={showMoveIndicators}
              onShowMoveIndicatorsChange={setShowMoveIndicators}
            />
            
            {/* Chess Board and Move Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Chess Board */}
              <div className="lg:col-span-2">
                <SimpleChessBoard showMoveIndicators={showMoveIndicators} />
              </div>
              
              {/* Move Panel */}
              <div className="lg:col-span-1">
                <MovePanel />
              </div>
            </div>
            
            {/* Review Button - only when game finished */}
            {gameState?.isGameOver && (
              <div className="text-center">
                <button
                  onClick={() => setShowReview(true)}
                  className="bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                >
                  Review Game
                </button>
              </div>
            )}
          </div>
        </main>

        {/* Game Review Modal */}
        <GameReview 
          isOpen={showReview} 
          onClose={() => setShowReview(false)} 
        />
        
        {/* Debug Overlay */}
        <DebugOverlay />
      </div>
    </DatabaseProvider>
  );
}

export default ChessTrainerApp;
