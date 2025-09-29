'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useStockfish } from '@/hooks/useStockfish';
// import { MoveAnalysis } from '@/types/chess';

interface GameReviewProps {
  isOpen: boolean;
  onClose: () => void;
  game?: { moves: string[]; pgn?: string; result?: string } | null;
}

export default function GameReview({ isOpen, onClose, game }: GameReviewProps) {
  const { gameState } = useDatabase();
  const { analyzePosition } = useStockfish();
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [currentFen, setCurrentFen] = useState(gameState.fen);
  
  // Debug: Track when currentFen changes
  useEffect(() => {
    console.log('🔄 currentFen state changed to:', currentFen);
  }, [currentFen]);
  const [positionEvaluation, setPositionEvaluation] = useState<number>(0);
  // Removed unused bestMove state to satisfy linter
  const [principalVariation, setPrincipalVariation] = useState<string[]>([]);
  const [completePvLines, setCompletePvLines] = useState<Array<{evaluation: number, moves: string[]}>>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [gameFens, setGameFens] = useState<string[]>([]);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  // Function to add debug logs
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    setDebugLogs(prev => [...prev.slice(-50), logMessage]); // Keep last 50 logs
  };

  // Function to copy debug logs
  const copyDebugLogs = () => {
    const logsText = debugLogs.join('\n');
    navigator.clipboard.writeText(logsText).then(() => {
      alert('Debug logs copied to clipboard!');
    });
  };

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
  }, [reviewGame.moves]);

  const analyzeCurrentPosition = useCallback(async (fen: string) => {
    addDebugLog('🔍 GameReview: Analyzing current position: ' + fen);
    addDebugLog('🔍 GameReview: analyzePosition function available? ' + typeof analyzePosition);
    setIsAnalyzing(true);
    
    try {
      addDebugLog('🔍 GameReview: Calling analyzePosition with FEN: ' + fen + ' depth: 18');
      // Use analyzePosition for full analysis with PV at maximum strength
             const result = await analyzePosition(fen, 18);
      addDebugLog('🔍 GameReview: Analysis result: ' + JSON.stringify(result));
      
      if (result) {
        setPositionEvaluation(result.evaluation || 0);
        setPrincipalVariation(result.pv || []);
        
        // Store complete PV lines if available
        if (result.pvLines) {
          console.log('🔍 GameReview: Complete PV lines:', result.pvLines);
          setCompletePvLines(result.pvLines);
        }
        
        addDebugLog('🔍 GameReview: Set evaluation: ' + result.evaluation);
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
      // Set initial position to the starting position
      console.log('🚀 Setting initial position');
      setCurrentMoveIndex(0);
      setCurrentFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
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

  if (!isOpen) return null;

  console.log('🎭 GameReview render - currentFen:', currentFen, 'currentMoveIndex:', currentMoveIndex, 'gameFens length:', gameFens.length);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-full flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Game Review</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={copyDebugLogs}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  📋 Copy Debug Logs
                </button>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

        <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Evaluation Bar, Chessboard and Analysis */}
        <div className="w-2/3 p-4 flex flex-col overflow-y-auto">
            {/* Top Section - Evaluation Bar and Chessboard */}
            <div className="flex items-center justify-center space-x-4">
              {/* Vertical Evaluation Bar - Same height as board */}
              <div className="flex flex-col items-center space-y-2">
                <div className="text-xs font-medium text-gray-600">Black</div>
                <div className="w-6 h-[500px] bg-gray-200 overflow-hidden relative flex flex-col">
                  {/* Black section (top) */}
                  <div 
                    className="w-full bg-red-500 transition-all duration-500"
                    style={{ 
                      height: `${Math.max(0, Math.min(100, 50 - (positionEvaluation / 100) * 25))}%`
                    }}
                  />
                  {/* White section (bottom) */}
                  <div 
                    className="w-full bg-green-500 transition-all duration-500"
                    style={{ 
                      height: `${Math.max(0, Math.min(100, 50 + (positionEvaluation / 100) * 25))}%`
                    }}
                  />
                  {/* Evaluation text overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-xs font-bold text-white drop-shadow transform -rotate-90">
                      {formatEvaluation(positionEvaluation)}
                    </span>
                  </div>
                </div>
                <div className="text-xs font-medium text-gray-600">White</div>
              </div>

              {/* Chessboard */}
              <div className="w-[500px] h-[500px]">
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
                    boardOrientation: 'white',
                    allowDragging: false,
                    showNotation: true
                  }}
                />
              </div>
            </div>

          {/* Move Navigation - moved above analysis */}
          <div className="flex items-center justify-center space-x-2 mt-4">
            <button
              onClick={goToStart}
              disabled={currentMoveIndex === 0}
              className="px-3 py-2 bg-blue-600 text-white rounded text-sm disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700"
            >
              ⏮️ Start
            </button>
            <button
              onClick={prevMove}
              disabled={currentMoveIndex === 0}
              className="px-3 py-2 bg-blue-600 text-white rounded text-sm disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700"
            >
              ⏪ Prev
            </button>
            <span className="px-3 py-2 bg-gray-100 text-gray-900 rounded text-sm font-medium">
              {currentMoveIndex} / {reviewGame.moves.length}
            </span>
            <button
              onClick={nextMove}
              disabled={currentMoveIndex === reviewGame.moves.length}
              className="px-3 py-2 bg-blue-600 text-white rounded text-sm disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700"
            >
              Next ⏩
            </button>
            <button
              onClick={goToEnd}
              disabled={currentMoveIndex === reviewGame.moves.length}
              className="px-3 py-2 bg-blue-600 text-white rounded text-sm disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700"
            >
              End ⏭️
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
                  <div className="text-sm font-medium text-gray-700 mb-3">Best Moves:</div>
                  <div className="space-y-2">
                    {completePvLines.length > 0 ? (
                      completePvLines.map((pvLine, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <span className="text-xs font-mono text-gray-600 min-w-[60px]">
                            [{formatEvaluation(pvLine.evaluation)}]
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {pvLine.moves.map((move, moveIndex) => (
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
                      principalVariation.slice(0, 4).map((move, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded text-xs font-mono ${
                            index === 0 ? 'bg-green-100 text-green-800 border-2 border-green-300' :
                            index === 1 ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                            index === 2 ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                            'bg-gray-100 text-gray-800 border border-gray-300'
                          }`}>
                            {move}
                          </span>
                          <span className="text-xs text-gray-600">
                            {index === 0 ? 'Best' : `#${index + 1}`}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* Current Position Evaluation */}
                  <div className="mt-3 pt-3 border-t border-gray-300">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Position:</span>
                      <span className={`font-bold text-lg ${getEvaluationColor(positionEvaluation)}`}>
                        {formatEvaluation(positionEvaluation)}
                      </span>
                    </div>
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