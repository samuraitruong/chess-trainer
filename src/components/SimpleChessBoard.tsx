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
}

export default function SimpleChessBoard({ showMoveIndicators = true }: SimpleChessBoardProps) {
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
    if (!gameState.isPlayerTurn && !gameState.isGameOver && gameState.moves.length > 0 && stockfishReady) {
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
    } else if (!gameState.isPlayerTurn && !gameState.isGameOver && gameState.moves.length > 0 && !stockfishReady) {
      console.log('Waiting for Stockfish to be ready...');
    }
  }, [gameState.isPlayerTurn, gameState.isGameOver, gameState.moves.length, stockfishReady, stockfishConfig, getAIMove, makeMove]);

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
        {/* AI material (top, no border) */}
       
        <div className="mb-2">
          <MaterialTracker side="black" noBorder />
        </div>
        <Chessboard
          options={{
            position: gameState.fen,
            onPieceDrop: onDrop,
            onPieceDrag: onDragStart,
            onSquareClick: onSquareClick,
            boardOrientation: 'white',
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
        {/* Player material (bottom) */}
        <div className="mt-2">
          <MaterialTracker side="white" noBorder/>
        </div>
        
        {gameState.isGameOver && (
          <div className="mt-4 text-center">
            <div className={`px-4 py-3 rounded ${
              gameState.result === 'white' 
                ? 'bg-green-100 border border-green-400 text-green-700'
                : gameState.result === 'black'
                ? 'bg-red-100 border border-red-400 text-red-700'
                : 'bg-yellow-100 border border-yellow-400 text-yellow-700'
            }`}>
              <strong>Game Over!</strong>
              <p>
                {gameState.result === 'white' && 'You won! 🎉'}
                {gameState.result === 'black' && 'AI won! 🤖'}
                {gameState.result === 'draw' && "It's a draw! 🤝"}
              </p>
              
              {gameResult && (
                <div className="mt-3 space-y-1">
                  {gameState.result === 'white' && (
                    <div className="text-sm">
                      <p className="text-green-600 font-semibold">
                        ELO: +{gameResult.eloChange} points
                      </p>
                      <p className="text-green-600">
                        Win Streak: {gameResult.winStreak} {gameResult.winStreak === 1 ? 'game' : 'games'}
                      </p>
                      {gameResult.winStreak >= 2 && (
                        <p className="text-green-500 text-xs">
                          {gameResult.winStreak >= 4 && '🔥 4+ streak bonus!'}
                          {gameResult.winStreak === 3 && '⚡ 3 streak bonus!'}
                          {gameResult.winStreak === 2 && '✨ 2 streak bonus!'}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {gameState.result === 'black' && (
                    <div className="text-sm">
                      <p className="text-red-600 font-semibold">
                        ELO: {gameResult.eloChange} points
                      </p>
                      <p className="text-red-600">
                        Win Streak: Reset to 0
                      </p>
                    </div>
                  )}
                  
                  {gameState.result === 'draw' && (
                    <div className="text-sm">
                      <p className="text-yellow-600">
                        ELO: No change
                      </p>
                      <p className="text-yellow-600">
                        Win Streak: Reset to 0
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
