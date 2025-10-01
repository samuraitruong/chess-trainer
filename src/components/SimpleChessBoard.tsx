'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useStockfish } from '@/hooks/useStockfish';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import MaterialTracker from '@/components/MaterialTracker';

interface SimpleChessBoardProps {
  showMoveIndicators?: boolean;
  onNewGame?: () => void;
  onReviewGame?: () => void;
}

export default function SimpleChessBoard({ showMoveIndicators = true, onNewGame, onReviewGame }: SimpleChessBoardProps) {
  const { gameState, makeMove, stockfishConfig, playerStats } = useDatabase();
  const [chess] = useState(() => new Chess());
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [gameResult, setGameResult] = useState<{eloChange: number, winStreak: number} | null>(null);
  const { getAIMove, isReady: stockfishReady } = useStockfish();
  const { playSound } = useSoundEffects();

  console.log('SimpleChessBoard rendered, gameState:', gameState);

  // Reset selection when it becomes the player's turn
  useEffect(() => {
    if (gameState.isPlayerTurn) {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  }, [gameState.isPlayerTurn]);

  // Check for check/checkmate and play sounds
  useEffect(() => {
    if (gameState.isGameOver) {
      if (gameState.result === 'white' || gameState.result === 'black') {
        playSound('checkmate');
      }
    } else {
      // Check if current position is in check
      const tempChess = new Chess(gameState.fen);
      if (tempChess.isCheck()) {
        playSound('check');
      }
    }
  }, [gameState.fen, gameState.isGameOver, gameState.result, playSound]);

  // Track ELO changes when game ends
  useEffect(() => {
    if (gameState.isGameOver && gameState.result) {
      // Calculate ELO change based on win streak
      let eloChange = 0;
      if (gameState.result === 'white') {
        // Progressive rating increase: 8, 16, 32, 64 (max)
        if ((playerStats?.win_streak || 0) >= 4) eloChange = 64;
        else if ((playerStats?.win_streak || 0) >= 3) eloChange = 32;
        else if ((playerStats?.win_streak || 0) >= 2) eloChange = 16;
        else eloChange = 8;
      } else if (gameState.result === 'black') {
        eloChange = -8; // Always -8 for loss
      }
      
      setGameResult({
        eloChange,
        winStreak: gameState.result === 'white' ? (playerStats?.win_streak || 0) + 1 : 0
      });
    } else if (!gameState.isGameOver) {
      // Reset when new game starts
      setGameResult(null);
    }
  }, [gameState.isGameOver, gameState.result, playerStats?.win_streak]);

  // Handle AI moves when it's the AI's turn
  // AI move logic using Stockfish
  useEffect(() => {
    if (!gameState.isPlayerTurn && !gameState.isGameOver && stockfishReady) {
      console.log('AI turn detected, using Stockfish with ELO:', stockfishConfig.elo);
      
      // Small delay to prevent layout flash
      const timeoutId = setTimeout(() => {
        getAIMove(gameState.fen, stockfishConfig, (move) => {
          console.log('Stockfish move:', move);
          makeMove(move);
        }).catch((error) => {
          console.error('Stockfish error:', error);
          // If Stockfish fails, the game will be stuck - this is intentional for testing
        });
      }, 100);

      return () => clearTimeout(timeoutId);
    } else if (!gameState.isPlayerTurn && !gameState.isGameOver && !stockfishReady) {
      console.log('Waiting for Stockfish to be ready...');
    }
  }, [gameState.isPlayerTurn, gameState.isGameOver, stockfishReady, stockfishConfig, getAIMove, makeMove]);

  const onDrop = useCallback(({ sourceSquare, targetSquare }: { piece: unknown; sourceSquare: string; targetSquare: string | null }) => {
    console.log('onDrop called:', sourceSquare, 'to', targetSquare);
    
    if (!targetSquare) return false;
    
    try {
      // Create a new chess instance with current position
      const tempChess = new Chess(gameState.fen);
      
      // Check if the move is in the legal moves list first
      const legalMoves = tempChess.moves({ square: sourceSquare as never, verbose: true });
      const isLegalMove = legalMoves.some(move => move.to === targetSquare);
      
      if (!isLegalMove) {
        console.log('Invalid move - not in legal moves list');
        return false;
      }
      
      // Check for castling - if king moves 2 squares horizontally, it's castling
      let move;
      if (sourceSquare === 'e1' && (targetSquare === 'g1' || targetSquare === 'c1')) {
        // White castling
        move = tempChess.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: 'q'
        });
      } else if (sourceSquare === 'e8' && (targetSquare === 'g8' || targetSquare === 'c8')) {
        // Black castling
        move = tempChess.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: 'q'
        });
      } else {
        // Regular move
        move = tempChess.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: 'q', // Always promote to queen
        });
      }

      if (move) {
        console.log('Move successful:', move.san);
        
        // Play appropriate sound effect
        if (move.flags.includes('c')) {
          playSound('castle');
        } else if (move.captured) {
          playSound('capture');
        } else {
          playSound('move');
        }
        
        const success = makeMove(move.san);
        console.log('makeMove result:', success);
        
        if (success) {
          // Update local chess instance
          chess.move(move);
          // AI move will be handled by useEffect when game state updates
        }
        return true;
      } else {
        console.log('Invalid move');
        return false;
      }
    } catch (error) {
      console.error('Move error:', error);
      return false;
    }
  }, [gameState.fen, makeMove, chess]);

  const onDragStart = useCallback(({ square }: { piece: unknown; square: string | null }) => {
    console.log('onDragStart:', square);
    return gameState.isPlayerTurn && !gameState.isGameOver;
  }, [gameState.isPlayerTurn, gameState.isGameOver]);

  const onSquareClick = useCallback(({ square }: { piece: unknown; square: string }) => {
    console.log('Square clicked:', square);
    
    if (!gameState.isPlayerTurn || gameState.isGameOver) {
      return;
    }

    // If no square is selected, select this square
    if (!selectedSquare) {
      const tempChess = new Chess(gameState.fen);
      const moves = tempChess.moves({ square: square as never, verbose: true });
      
      if (moves.length > 0) {
        setSelectedSquare(square);
        setLegalMoves(moves.map(move => move.to));
        console.log('Selected square:', square, 'Legal moves:', moves.map(move => move.to));
        
        // Special handling for castling - show both king and rook positions
        if (square === 'e1' || square === 'e8') {
          const castlingMoves = moves.filter(move => move.flags.includes('c'));
          if (castlingMoves.length > 0) {
            console.log('Castling available:', castlingMoves);
          }
        }
      }
    } else {
      // If a square is already selected
      if (selectedSquare === square) {
        // Deselect if clicking the same square
        setSelectedSquare(null);
        setLegalMoves([]);
      } else if (legalMoves.includes(square)) {
        // Make the move if it's a legal target square
        const tempChess = new Chess(gameState.fen);
        
        // Check for castling - if king moves 2 squares horizontally, it's castling
        let move;
        if (selectedSquare === 'e1' && (square === 'g1' || square === 'c1')) {
          // White castling
          move = tempChess.move({
            from: selectedSquare,
            to: square,
            promotion: 'q'
          });
        } else if (selectedSquare === 'e8' && (square === 'g8' || square === 'c8')) {
          // Black castling
          move = tempChess.move({
            from: selectedSquare,
            to: square,
            promotion: 'q'
          });
        } else {
          // Regular move
          move = tempChess.move({
            from: selectedSquare,
            to: square,
            promotion: 'q'
          });
        }
        
        if (move) {
          console.log('Click move successful:', move.san);
          
          // Play appropriate sound effect
          if (move.flags.includes('c')) {
            playSound('castle');
          } else if (move.captured) {
            playSound('capture');
          } else {
            playSound('move');
          }
          
          makeMove(move.san);
          setSelectedSquare(null);
          setLegalMoves([]);
        }
      } else {
        // Select a different piece
        const tempChess = new Chess(gameState.fen);
        const moves = tempChess.moves({ square: square as never, verbose: true });
        
        if (moves.length > 0) {
          setSelectedSquare(square);
          setLegalMoves(moves.map(move => move.to));
        } else {
          setSelectedSquare(null);
          setLegalMoves([]);
        }
      }
    }
  }, [gameState.isPlayerTurn, gameState.isGameOver, gameState.fen, selectedSquare, legalMoves, makeMove]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-4">
        {/* AI material (top, no border) - Always AI on top */}
        <div className="mb-2">
          <MaterialTracker side={gameState.playerColor === 'white' ? 'black' : 'white'} noBorder />
        </div>
        <Chessboard
          options={{
            position: gameState.fen,
            onPieceDrop: onDrop,
            onPieceDrag: onDragStart,
            onSquareClick: onSquareClick,
            boardOrientation: gameState.playerColor,
            allowDragging: gameState.isPlayerTurn,
            showNotation: true,
            squareStyles: {
              ...(selectedSquare && showMoveIndicators && {
                [selectedSquare]: {
                  backgroundColor: 'rgba(255, 255, 0, 0.2)',
                  borderRadius: '50%',
                  boxShadow: 'inset 0 0 0 2px rgba(255, 255, 0, 0.5)',
                },
              }),
              ...(showMoveIndicators ? legalMoves.reduce((styles, square) => {
                // Check if this is a castling move
                const isCastling = (selectedSquare === 'e1' && (square === 'g1' || square === 'c1')) ||
                                 (selectedSquare === 'e8' && (square === 'g8' || square === 'c8'));
                
                styles[square] = {
                  background: `radial-gradient(circle at center, rgba(255, 140, 0, 0.75) 0%, rgba(255, 140, 0, 0.75) 15%, transparent 15%)`,
                };
                return styles;
              }, {} as Record<string, React.CSSProperties>) : {}),
            },
          }}
        />
        {/* Player material (bottom) - Always Player on bottom */}
        <div className="mt-2">
          <MaterialTracker side={gameState.playerColor} noBorder/>
        </div>
        
        {/* Game Over Modal - Kid Friendly Design */}
        {gameState.isGameOver && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-gradient-to-br from-purple-900/80 via-blue-900/80 to-indigo-900/80 backdrop-blur-sm"
              onClick={(e) => {
                // Only close if clicking the backdrop, not the modal content
                if (e.target === e.currentTarget) {
                  if (onNewGame) {
                    onNewGame();
                  }
                }
              }}
            />
            <div 
              className="relative bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 rounded-3xl shadow-2xl w-full max-w-lg border-4 border-yellow-300 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              
              {/* Header with Fun Animation */}
              <div className="text-center pt-6 pb-4 relative">
                {/* Close Button - positioned in top-right of header */}
                <button
                  onClick={onNewGame}
                  className="absolute top-2 right-2 w-8 h-8 bg-red-400 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-lg z-10"
                  aria-label="Close modal"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="text-3xl mb-2 animate-bounce mt-4">
                  {gameState.result === gameState.playerColor && '🏆'}
                  {gameState.result !== 'draw' && gameState.result !== gameState.playerColor && '😢'}
                  {gameState.result === 'draw' && '🤝'}
                </div>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">
                  {gameState.result === 'draw' && "It's a Draw!"}
                  {gameState.result === gameState.playerColor && 'Amazing Win!'}
                  {gameState.result !== 'draw' && gameState.result !== gameState.playerColor && 'Good Try!'}
                </h2>
                <p className="text-lg text-gray-600">
                  {gameState.result === 'draw' && "You both played great! 🤝"}
                  {gameState.result === gameState.playerColor && 'You are getting stronger! 💪'}
                  {gameState.result !== 'draw' && gameState.result !== gameState.playerColor && 'Keep practicing! 🌟'}
                </p>
              </div>

              {/* Stats Card */}
              {gameResult && (
                <div className="mx-6 mb-6">
                  <div className={`rounded-2xl p-4 border-2 ${
                    gameState.result === gameState.playerColor
                      ? 'bg-gradient-to-r from-green-100 to-emerald-100 border-green-300'
                      : gameState.result !== 'draw'
                      ? 'bg-gradient-to-r from-blue-100 to-cyan-100 border-blue-300'
                      : 'bg-gradient-to-r from-yellow-100 to-orange-100 border-yellow-300'
                  }`}>
                    
                    {gameState.result === gameState.playerColor && (
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-3">
                          <span className="text-2xl mr-2">⭐</span>
                          <span className="text-xl font-bold text-green-700">
                            +{gameResult.eloChange} Points!
                          </span>
                          <span className="text-2xl ml-2">⭐</span>
                        </div>
                        <div className="bg-white/70 rounded-xl p-3 mb-3">
                          <p className="text-lg font-bold text-green-800">
                            New Level: {playerStats?.current_elo || 0}
                          </p>
                        </div>
                        <div className="flex items-center justify-center space-x-2">
                          <span className="text-lg">🔥</span>
                          <span className="text-green-700 font-semibold">
                            {gameResult.winStreak} Win{gameResult.winStreak !== 1 ? 's' : ''} in a Row!
                          </span>
                          <span className="text-lg">🔥</span>
                        </div>
                        {gameResult.winStreak >= 2 && (
                          <div className="mt-2 text-sm font-bold text-green-600">
                            {gameResult.winStreak >= 4 && '🌟 SUPER STREAK! 🌟'}
                            {gameResult.winStreak === 3 && '⚡ 3 STREAK BONUS! ⚡'}
                            {gameResult.winStreak === 2 && '✨ 2 STREAK BONUS! ✨'}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {gameState.result !== 'draw' && gameState.result !== gameState.playerColor && (
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-3">
                          <span className="text-2xl mr-2">💪</span>
                          <span className="text-xl font-bold text-blue-700">
                            {gameResult.eloChange > 0 ? '+' : ''}{gameResult.eloChange} Points
                          </span>
                          <span className="text-2xl ml-2">💪</span>
                        </div>
                        <div className="bg-white/70 rounded-xl p-3 mb-3">
                          <p className="text-lg font-bold text-blue-800">
                            Current Level: {playerStats?.current_elo || 0}
                          </p>
                        </div>
                        <div className="flex items-center justify-center space-x-2">
                          <span className="text-lg">🎯</span>
                          <span className="text-blue-700 font-semibold">
                            Ready for a comeback!
                          </span>
                          <span className="text-lg">🎯</span>
                        </div>
                      </div>
                    )}
                    
                    {gameState.result === 'draw' && (
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-3">
                          <span className="text-2xl mr-2">🤝</span>
                          <span className="text-xl font-bold text-yellow-700">
                            No Change
                          </span>
                          <span className="text-2xl ml-2">🤝</span>
                        </div>
                        <div className="bg-white/70 rounded-xl p-3 mb-3">
                          <p className="text-lg font-bold text-yellow-800">
                            Current Level: {playerStats?.current_elo || 0}
                          </p>
                        </div>
                        <div className="flex items-center justify-center space-x-2">
                          <span className="text-lg">🎨</span>
                          <span className="text-yellow-700 font-semibold">
                            Great game! Keep playing!
                          </span>
                          <span className="text-lg">🎨</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="px-6 pb-6">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      console.log('New Game button clicked');
                      if (onNewGame) {
                        onNewGame();
                      }
                    }}
                    className="group bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-xl transform active:scale-95"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-xl">♟️</span>
                      <span>New Game</span>
                      <span className="text-xl">♟️</span>
                    </div>
                  </button>
                  <button
                    onClick={onReviewGame}
                    className="group bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-xl transform active:scale-95"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-xl">🔍</span>
                      <span>Review</span>
                      <span className="text-xl">🔍</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
