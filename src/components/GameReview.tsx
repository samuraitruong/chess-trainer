'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { IoClose, IoPlaySkipBack, IoPlayBack, IoPlayForward, IoPlaySkipForward } from 'react-icons/io5';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useStockfish } from '@/hooks/useStockfish';
// import { MoveAnalysis } from '@/types/chess';

// Best Move Icon Component
const BestMoveIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg 
    className={className} 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="12" cy="12" r="10" fill="#10b981" stroke="#059669" strokeWidth="2"/>
    <path 
      d="M8 12l2 2 4-4" 
      stroke="white" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <text 
      x="12" 
      y="16" 
      fontSize="8" 
      fill="white" 
      textAnchor="middle" 
      fontWeight="bold"
    >
      BEST
    </text>
  </svg>
);

interface GameReviewProps {
  isOpen: boolean;
  onClose: () => void;
  game?: { 
    moves: string[]; 
    pgn?: string; 
    result?: string;
    playerColor?: 'white' | 'black';
    aiLevel?: number;
  } | null;
}

export default function GameReview({ isOpen, onClose, game }: GameReviewProps) {
  const { gameState } = useDatabase();
  const { analyzePosition } = useStockfish();
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [currentFen, setCurrentFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  
  // Debug: Track when currentFen changes
  useEffect(() => {
    console.log('🔄 currentFen state changed to:', currentFen);
  }, [currentFen]);

  // Reset to starting position when review opens
  useEffect(() => {
    if (isOpen) {
      setCurrentMoveIndex(0);
      setCurrentFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      setLastMoveArrow(null);
      setBestMoveArrow(null);
      setPositionEvaluation(0);
      setMateIn(null);
      setMateFor(null);
      setPrincipalVariation([]);
      setCompletePvLines([]);
    }
  }, [isOpen]);
  const [positionEvaluation, setPositionEvaluation] = useState<number>(0);
  const [mateIn, setMateIn] = useState<number | null>(null);
  const [mateFor, setMateFor] = useState<'white' | 'black' | null>(null);
  // Removed unused bestMove state to satisfy linter
  const [principalVariation, setPrincipalVariation] = useState<string[]>([]);
  const [completePvLines, setCompletePvLines] = useState<Array<{evaluation: number, moves: string[]}>>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [gameFens, setGameFens] = useState<string[]>([]);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [lastMoveArrow, setLastMoveArrow] = useState<[string, string] | null>(null);
  const [bestMoveArrow, setBestMoveArrow] = useState<[string, string] | null>(null);

  // Function to add debug logs
  const addDebugLog = (_message: string) => {};

  // Function to copy debug logs
  const copyDebugLogs = () => {};

  // Use provided game or current game state
  const reviewGame = game || {
    moves: gameState.moves,
    pgn: '',
    result: gameState.result || 'draw'
  };

  // Generate all FEN strings for the game
  const generateGameFens = useCallback(() => {
    console.log('🔧 generateGameFens called - moves length:', reviewGame.moves.length);
    if (reviewGame.moves.length === 0) {
      console.log('🔧 No moves to process');
      return;
    }
    
    console.log('🔧 Generating FEN strings for', reviewGame.moves.length, 'moves');
    const chess = new Chess();
    const fens: string[] = [chess.fen()]; // Starting position
    console.log('🔧 Starting FEN:', chess.fen());
    
    for (let i = 0; i < reviewGame.moves.length; i++) {
      try {
        console.log(`🔧 Processing move ${i}:`, reviewGame.moves[i]);
        const move = chess.move(reviewGame.moves[i]);
        if (move) {
          fens.push(chess.fen());
          console.log(`🔧 Move ${i} FEN:`, chess.fen());
        } else {
          console.error('❌ Invalid move at index', i, ':', reviewGame.moves[i]);
          break;
        }
      } catch (error) {
        console.error('❌ Error processing move', i, ':', reviewGame.moves[i], error);
        break;
      }
    }
    
    console.log('🔧 Generated', fens.length, 'FEN strings:', fens);
    setGameFens(fens);
    // Set initial view to the first move if available
    if (fens.length > 1) {
      setCurrentMoveIndex(1);
      setCurrentFen(fens[1]);
      console.log('🚀 Initial review position set to first move FEN:', fens[1]);
      try {
        const chessForArrow = new Chess();
        const mv = chessForArrow.move(reviewGame.moves[0]);
        if (mv) {
          setLastMoveArrow([mv.from as string, mv.to as string]);
        } else {
          setLastMoveArrow(null);
        }
      } catch (e) {
        setLastMoveArrow(null);
      }
    } else if (fens.length > 0) {
      setCurrentMoveIndex(0);
      setCurrentFen(fens[0]);
    }
  }, [reviewGame.moves]);

  const analyzeCurrentPosition = useCallback(async (fen: string) => {
    addDebugLog('🔍 GameReview: Analyzing current position: ' + fen);
    addDebugLog('🔍 GameReview: analyzePosition function available? ' + typeof analyzePosition);
    setIsAnalyzing(true);
    
    try {
      // If position is already checkmate, lock UI to M0 and full bar for winner
      try {
        const cmChess = new Chess();
        cmChess.load(fen);
        if (cmChess.isCheckmate()) {
          const sideToMove = fen.split(' ')[1] === 'b' ? 'b' : 'w';
          const winner = sideToMove === 'w' ? 'black' : 'white';
          setMateIn(0);
          setMateFor(winner as 'white' | 'black');
          setPositionEvaluation(winner === 'white' ? 32000 : -32000);
          setCompletePvLines([]);
          setPrincipalVariation([]);
          setBestMoveArrow(null);
          addDebugLog('♟️ Detected checkmate from FEN. Winner: ' + winner + ' (M0). Skipping engine analysis.');
          setIsAnalyzing(false);
          return;
        }
      } catch (e) {
        // Ignore parse errors and continue to engine analysis
      }

      addDebugLog('🔍 GameReview: Calling analyzePosition with FEN: ' + fen + ' depth: 18');
      // Use analyzePosition for full analysis with PV at maximum strength, with live updates
             const result = await analyzePosition(
        fen,
        18,
        (partial) => {
          // Live UI updates as stronger lines arrive
          setPositionEvaluation(partial.evaluation || 0);
          setCompletePvLines(partial.pvLines || []);
          setMateIn(partial.mateIn ?? null);
          setMateFor(partial.mateFor ?? null);
          // Update best move arrow from live PV
          try {
            const chessForBestLive = new Chess(fen);
            const bestLineLive = partial.pvLines && partial.pvLines[0];
            const bestSanLive = bestLineLive && bestLineLive.moves && bestLineLive.moves[0];
            if (bestSanLive) {
              const mv = chessForBestLive.move(bestSanLive);
              if (mv && typeof mv.from === 'string' && typeof mv.to === 'string') {
                setBestMoveArrow([mv.from as string, mv.to as string]);
              }
            }
          } catch (e) {
            // ignore
          }
        }
      );
      addDebugLog('🔍 GameReview: Analysis result: ' + JSON.stringify(result));
      
      if (result) {
        setPositionEvaluation(result.evaluation || 0);
        setPrincipalVariation(result.pv || []);
        setMateIn(result.mateIn ?? null);
        setMateFor(result.mateFor ?? null);

        // Compute best move arrow from PV for current position
        try {
          const chessForBest = new Chess(fen);
          let bestSan: string | null = null;
          if (result.pvLines && result.pvLines.length > 0 && result.pvLines[0].moves.length > 0) {
            bestSan = result.pvLines[0].moves[0];
          } else if (result.pv && result.pv.length > 0) {
            bestSan = result.pv[0];
          }
          if (bestSan) {
            const move = chessForBest.move(bestSan);
            if (move && typeof move.from === 'string' && typeof move.to === 'string') {
              setBestMoveArrow([move.from as string, move.to as string]);
            } else {
              setBestMoveArrow(null);
            }
          } else {
            setBestMoveArrow(null);
          }
        } catch (e) {
          setBestMoveArrow(null);
        }
        
        // Store complete PV lines if available
        if (result.pvLines) {
          console.log('🔍 GameReview: Complete PV lines:', result.pvLines);
          setCompletePvLines(result.pvLines);
        }
        
        addDebugLog('🔍 GameReview: Set evaluation: ' + result.evaluation);
        if (result.mateIn != null) {
          addDebugLog('🔍 GameReview: Detected mate: M' + Math.abs(result.mateIn) + ' for ' + result.mateFor);
        }
        addDebugLog('🔍 GameReview: Set PV: ' + JSON.stringify(result.pv));
      } else {
        addDebugLog('🔍 GameReview: No result from analyzePosition');
      }
    } catch (error) {
      addDebugLog('❌ GameReview: Failed to analyze position: ' + error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [analyzePosition]);

  // Generate FEN strings when component opens
  useEffect(() => {
    console.log('🚀 Component open useEffect - isOpen:', isOpen, 'moves length:', reviewGame.moves.length);
    if (isOpen && reviewGame.moves.length > 0) {
      console.log('🚀 Calling generateGameFens');
      generateGameFens();
    }
  }, [isOpen, generateGameFens, reviewGame.moves.length]);

  // Analyze position when FEN changes
  useEffect(() => {
    addDebugLog('🔄 GameReview: FEN useEffect triggered - isOpen: ' + isOpen + ' currentFen: ' + currentFen);
    addDebugLog('🔄 GameReview: useEffect dependencies - isOpen: ' + isOpen + ' currentFen: ' + currentFen + ' analyzeCurrentPosition: ' + typeof analyzeCurrentPosition);
    if (isOpen && currentFen) {
      addDebugLog('🔄 GameReview: Calling analyzeCurrentPosition with FEN: ' + currentFen);
      analyzeCurrentPosition(currentFen);
    } else {
      addDebugLog('🔄 GameReview: Not calling analyzeCurrentPosition - isOpen: ' + isOpen + ' currentFen: ' + currentFen);
    }
  }, [isOpen, currentFen, analyzeCurrentPosition]);

  const goToMove = (index: number) => {
    addDebugLog('🎯 GameReview: goToMove called with index: ' + index);
    addDebugLog('🎯 GameReview: Current gameFens length: ' + gameFens.length);
    addDebugLog('🎯 GameReview: Current moveIndex before: ' + currentMoveIndex);
    addDebugLog('🎯 GameReview: Current FEN before: ' + currentFen);
    
    setCurrentMoveIndex(index);
    
    // gameFens[0] is starting position, gameFens[1] is after move 1, etc.
    // So we need to use index + 1 to get the correct FEN
    const fenIndex = index + 1;
    if (gameFens.length > fenIndex) {
      const newFen = gameFens[fenIndex];
      addDebugLog('🎯 GameReview: Using pre-calculated FEN at index ' + fenIndex + ': ' + newFen);
      addDebugLog('🎯 GameReview: FEN is different from current? ' + (newFen !== currentFen));
      setCurrentFen(newFen);
      addDebugLog('🎯 GameReview: setCurrentFen called with: ' + newFen);
      addDebugLog('🎯 GameReview: This should trigger useEffect for analysis');
      // Analysis will be triggered by useEffect when currentFen changes
      // Compute last move arrow from game start to this index
      try {
        const chessForArrow = new Chess();
        let last: { from: string; to: string } | null = null;
        for (let i = 0; i < index; i++) {
          const mv = chessForArrow.move(reviewGame.moves[i]);
          if (mv) {
            last = { from: mv.from as string, to: mv.to as string };
          }
        }
        setLastMoveArrow(last ? [last.from, last.to] : null);
      } catch (e) {
        setLastMoveArrow(null);
      }
    } else {
      addDebugLog('❌ GameReview: FEN not found for move index: ' + index + ' fenIndex: ' + fenIndex + ' gameFens length: ' + gameFens.length);
    }
  };

  const prevMove = () => {
    if (currentMoveIndex > 0) {
      goToMove(currentMoveIndex - 1);
    }
  };

  const nextMove = () => {
    if (currentMoveIndex < reviewGame.moves.length) {
      goToMove(currentMoveIndex + 1);
    }
  };

  const goToStart = () => {
    goToMove(0);
  };

  const goToEnd = () => {
    goToMove(reviewGame.moves.length);
  };

  const formatEvaluation = (evaluation: number) => {
    // If mate detected, display as M<N>
    if (mateIn != null && mateFor) {
      return `M${Math.abs(mateIn)}`;
    }
    if (Math.abs(evaluation) < 10) return '0.0';
    // Convert centipawns to pawns (divide by 100)
    const pawns = evaluation / 100;
    return pawns > 0 ? `+${pawns.toFixed(1)}` : `${pawns.toFixed(1)}`;
  };

  const getEvaluationColor = (evaluation: number) => {
    if (Math.abs(evaluation) < 10) return 'text-gray-700';
    if (evaluation > 0) return 'text-green-700';
    return 'text-red-700';
  };

  const getMoveColor = (index: number) => {
    if (index === currentMoveIndex) return 'bg-blue-100 text-blue-900 font-bold';
    return 'bg-gray-50 text-gray-700';
  };

  console.log('🎭 GameReview render - currentFen:', currentFen, 'currentMoveIndex:', currentMoveIndex, 'gameFens length:', gameFens.length);

  // Keyboard navigation: ArrowLeft/ArrowRight
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevMove();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextMove();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, prevMove, nextMove]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-full flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Game Review</h2>
              <div className="flex items-center space-x-2">
                
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700 text-2xl flex items-center"
                  aria-label="Close"
                >
                  <IoClose />
                </button>
              </div>
            </div>

        <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Evaluation Bar, Chessboard and Analysis */}
        <div className="w-2/3 p-4 flex flex-col overflow-y-auto">
            {/* Top Section - Evaluation Bar and Chessboard */}
            <div className="flex items-center justify-center space-x-4">
              {/* Vertical Evaluation Bar - Rotated based on player color */}
              <div className="flex flex-col items-center space-y-2">
                <div className="w-6 h-[500px] bg-gray-200 overflow-hidden relative flex flex-col">
                  {(() => {
                    const playerColor = reviewGame.playerColor || 'white';
                    const isPlayerWhite = playerColor === 'white';
                    
                    // Calculate evaluation from player's perspective
                    const playerEvaluation = isPlayerWhite ? positionEvaluation : -positionEvaluation;
                    
                    return (
                      <>
                        {/* Black section (top) */}
                        <div 
                          className="w-full bg-gray-700 transition-all duration-500"
                          style={{ 
                            height: `${(() => {
                              // If mate detected, snap bar fully to advantaged side
                              if (mateIn != null && mateFor) {
                                const mateForPlayer = (mateFor === playerColor);
                                return mateForPlayer ? 0 : 100;
                              }
                              return Math.max(0, Math.min(100, 50 - (playerEvaluation / 100) * 6.25));
                            })()}%`
                          }}
                        />
                        {/* White section (bottom) */}
                        <div 
                          className="w-full bg-gray-300 transition-all duration-500"
                          style={{ 
                            height: `${(() => {
                              if (mateIn != null && mateFor) {
                                const mateForPlayer = (mateFor === playerColor);
                                return mateForPlayer ? 100 : 0;
                              }
                              return Math.max(0, Math.min(100, 50 + (playerEvaluation / 100) * 6.25));
                            })()}%`
                          }}
                        />
                        {/* Evaluation text overlay */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="text-xs font-bold text-white drop-shadow transform -rotate-90 px-1 py-0.5 bg-black/50 rounded">
                            {formatEvaluation(playerEvaluation)}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Chessboard */}
              <div className="w-[500px] h-[500px] relative">
                {(() => {
                  console.log('🎨 Rendering Chessboard with FEN:', currentFen, 'Move Index:', currentMoveIndex);
                  // Validate FEN format
                  const chess = new Chess();
                  try {
                    chess.load(currentFen);
                    console.log('✅ FEN is valid:', currentFen);
                  } catch (error) {
                    console.error('❌ Invalid FEN:', currentFen, error);
                  }
                  return null;
                })()}
                <Chessboard
                  options={{
                    position: currentFen,
                    boardOrientation: reviewGame.playerColor || 'white',
                    allowDragging: false,
                    showNotation: true,
                    arrows: [
                      ...(lastMoveArrow ? [{ startSquare: lastMoveArrow[0], endSquare: lastMoveArrow[1], color: '#f59e0b' }] : []),
                      ...(bestMoveArrow ? [{ 
                        startSquare: bestMoveArrow[0], 
                        endSquare: bestMoveArrow[1], 
                        color: '#10b981'
                      }] : []),
                    ],
                  }}
                />
                {/* Best Move Icon Overlay */}
                {bestMoveArrow && (
                  <div 
                    className="absolute pointer-events-none z-10"
                    style={{
                      left: `${((bestMoveArrow[1].charCodeAt(0) - 97) * 12.5) + 6.25}%`,
                      top: `${((8 - parseInt(bestMoveArrow[1][1])) * 12.5) + 6.25}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <BestMoveIcon className="w-6 h-6 drop-shadow-lg" />
                  </div>
                )}
              </div>
            </div>

          {/* Move Navigation - moved above analysis */}
          <div className="flex items-center justify-center space-x-2 mt-4">
            <button
              onClick={goToStart}
              disabled={currentMoveIndex === 0}
              className="px-3 py-2 bg-blue-600 text-white rounded text-sm disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 flex items-center"
              aria-label="Go to start"
            >
              <IoPlaySkipBack />
            </button>
            <button
              onClick={prevMove}
              disabled={currentMoveIndex === 0}
              className="px-3 py-2 bg-blue-600 text-white rounded text-sm disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 flex items-center"
              aria-label="Previous move"
            >
              <IoPlayBack />
            </button>
            <span className="px-3 py-2 bg-gray-100 text-gray-900 rounded text-sm font-medium">
              {Math.min(Math.max(currentMoveIndex, 1), reviewGame.moves.length)} / {reviewGame.moves.length}
            </span>
            <button
              onClick={nextMove}
              disabled={currentMoveIndex === reviewGame.moves.length}
              className="px-3 py-2 bg-blue-600 text-white rounded text-sm disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 flex items-center"
              aria-label="Next move"
            >
              <IoPlayForward />
            </button>
            <button
              onClick={goToEnd}
              disabled={currentMoveIndex === reviewGame.moves.length}
              className="px-3 py-2 bg-blue-600 text-white rounded text-sm disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 flex items-center"
              aria-label="Go to end"
            >
              <IoPlaySkipForward />
            </button>
          </div>

          {/* Simple Move List - Below the navigation */}
          <div className="mt-4">
              {isAnalyzing ? (
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-blue-700">Analyzing position...</span>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <span>Engine moves:</span>
                    <BestMoveIcon className="w-5 h-5" />
                    <span className="text-xs text-green-600 font-medium">Best move</span>
                  </div>
                  <div className="space-y-2">
                    {completePvLines.length > 0 ? (
                      completePvLines.map((pvLine, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          {index === 0 && <BestMoveIcon className="w-4 h-4" />}
                          <span className="text-xs font-mono text-gray-600 min-w-[60px]">[{formatEvaluation(pvLine.evaluation)}]</span>
                          <div className="flex flex-wrap gap-1">
                            {pvLine.moves.slice(0, 6).map((move, moveIndex) => (
                              <span
                                key={moveIndex}
                                className={`px-2 py-1 rounded text-xs font-mono ${
                                  index === 0 ? 'bg-green-100 text-green-800' :
                                  index === 1 ? 'bg-blue-100 text-blue-800' :
                                  index === 2 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {move}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono text-gray-600 min-w-[60px]">[{formatEvaluation(positionEvaluation)}]</span>
                        <div className="flex flex-wrap gap-1">
                          {principalVariation.slice(0, 4).map((move, index) => (
                            <span
                              key={index}
                              className={`px-2 py-1 rounded text-xs font-mono ${
                                index === 0 ? 'bg-green-100 text-green-800' :
                                index === 1 ? 'bg-blue-100 text-blue-800' :
                                index === 2 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {move}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

            
            </div>
          </div>

          {/* Right Panel - Move List */}
          <div className="w-1/3 p-4 overflow-y-auto border-l border-gray-200">
            <div className="space-y-4">
                {/* Game Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-3 text-gray-900">Game Summary</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700">Total Moves</p>
                      <p className="text-2xl font-bold text-gray-900">{reviewGame.moves.length}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700">Result</p>
                      <p className="text-4xl font-bold text-gray-900">
                        {reviewGame.result === 'white' || reviewGame.result === 'win' ? '1-0' : reviewGame.result === 'black' || reviewGame.result === 'loss' ? '0-1' : '½-½'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Move List - 2 Column Layout */}
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-gray-900">Move List</h3>
                  <div className="max-h-96 overflow-y-auto">
                    {Array.from({ length: Math.ceil(reviewGame.moves.length / 2) }, (_, rowIndex) => (
                      <div key={rowIndex} className="flex py-1">
                        {/* Move Number */}
                        <div className="w-12 text-center text-sm font-medium text-gray-600 flex items-center justify-center">
                          {rowIndex + 1}.
                        </div>
                        
                        {/* White Move */}
                        <div className="flex-1 pr-2">
                          {reviewGame.moves[rowIndex * 2] && (
                            <div
                              className={`px-2 py-1 rounded cursor-pointer transition-colors text-sm ${
                                getMoveColor(rowIndex * 2)
                              }`}
                              onClick={() => goToMove(rowIndex * 2)}
                            >
                              <span>
                                {reviewGame.moves[rowIndex * 2]}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Black Move */}
                        <div className="flex-1 pl-2">
                          {reviewGame.moves[rowIndex * 2 + 1] && (
                            <div
                              className={`px-2 py-1 rounded cursor-pointer transition-colors text-sm ${
                                getMoveColor(rowIndex * 2 + 1)
                              }`}
                              onClick={() => goToMove(rowIndex * 2 + 1)}
                            >
                              <span>
                                {reviewGame.moves[rowIndex * 2 + 1]}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}