'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { databaseService, GameRecord, PlayerStatsRecord } from '@/services/database';
import { GameState, GameResult, StockfishConfig } from '@/types/chess';
import { Chess } from 'chess.js';
import { StockfishAnalysis } from '@/utils/stockfishAnalysis';

interface DatabaseContextType {
  gameState: GameState;
  playerStats: PlayerStatsRecord | null;
  stockfishConfig: StockfishConfig;
  isDatabaseReady: boolean;
  makeMove: (move: string) => boolean;
  resetGame: () => void;
  startNewGame: () => void;
  startUnratedGame: (aiLevel: number) => void;
  updateStats: (result: GameResult) => void;
  setStockfishElo: (elo: number) => void;
  loadPlayerStats: () => Promise<void>;
  saveGame: (game: GameRecord) => Promise<void>;
  getGames: (limit?: number, offset?: number) => Promise<GameRecord[]>;
  exportData: () => Promise<{ games: GameRecord[]; playerStats: PlayerStatsRecord | null }>;
  importData: (data: { games: GameRecord[]; playerStats: PlayerStatsRecord | null }) => Promise<void>;
  isComputingAccuracy: boolean;
  moveAccuracies: number[];
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

const initialState: GameState = {
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  moves: [],
  isGameOver: false,
  result: null,
  isPlayerTurn: true,
  isThinking: false,
  currentElo: 100,
  playerColor: 'white',
  aiLevel: 1,
};

const initialStockfishConfig: StockfishConfig = {
  elo: 100,
  depth: 15,
  timeLimit: 1000,
};

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [playerStats, setPlayerStats] = useState<PlayerStatsRecord | null>(null);
  const [stockfishConfig, setStockfishConfig] = useState<StockfishConfig>(initialStockfishConfig);
  const [isDatabaseReady, setIsDatabaseReady] = useState(false);
  const [isComputingAccuracy, setIsComputingAccuracy] = useState(false);
  const [moveAccuracies, setMoveAccuracies] = useState<number[]>([]);
  const [analysisEngine, setAnalysisEngine] = useState<StockfishAnalysis | null>(null);

  // Initialize database on mount
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        console.log('Starting database initialization...');
        await databaseService.initialize();
        
        // Test the database to ensure it's working
        const testResult = await databaseService.testDatabase();
        if (testResult) {
          console.log('Database test passed, setting ready and loading stats');
          setIsDatabaseReady(true);
          await loadPlayerStats();
          console.log('Database initialized and tested successfully');
        } else {
          console.log('Database test failed');
          throw new Error('Database test failed');
        }
      } catch (error) {
        console.error('Failed to initialize database:', error);
        console.error('Error details:', error);
        // Fallback: set database as ready anyway to allow basic functionality
        setIsDatabaseReady(true);
        console.log('Using fallback mode without database');
      }
    };

    initializeDatabase();
  }, []);

  // Update stockfishConfig when playerStats.currentElo changes
  useEffect(() => {
    console.log('=== Player Stats Effect Triggered ===');
    console.log('playerStats:', playerStats);
    console.log('playerStats?.current_elo:', playerStats?.current_elo);
    
    if (playerStats) {
      setStockfishConfig(prev => ({ ...prev, elo: playerStats.current_elo }));
      console.log('Updated stockfishConfig.elo to:', playerStats.current_elo);
      
      // Auto-update game state when player stats are loaded
      console.log('Player stats loaded, updating game state...');
      const currentElo = playerStats.current_elo;
      const minElo = 50, maxElo = 2000;
      const fraction = Math.max(0, Math.min(1, (currentElo - minElo) / (maxElo - minElo)));
      const aiLevel = 1 + Math.floor(fraction * 19);
      
      console.log('Auto-updating game state:', {
        currentElo,
        aiLevel,
        fraction
      });
      
      setGameState(prev => {
        console.log('Previous game state:', prev);
        const newState = {
          ...prev,
          currentElo,
          aiLevel
        };
        console.log('New game state:', newState);
        return newState;
      });
    }
  }, [playerStats?.current_elo]);

  const loadPlayerStats = async () => {
    console.log('=== loadPlayerStats called ===');
    try {
      const stats = await databaseService.getPlayerStats();
      console.log('Database returned stats:', stats);
      setPlayerStats(stats);
      console.log('Loaded player stats from database:', stats);
    } catch (error) {
      console.error('Failed to load player stats from database:', error);
      
      // Fallback to localStorage if database fails
      try {
        const savedStats = localStorage.getItem('chess-trainer-stats');
        if (savedStats) {
          const parsed = JSON.parse(savedStats);
          // Convert localStorage format to database format
          const fallbackStats: PlayerStatsRecord = {
            id: 1,
            current_elo: parsed.currentElo || 100,
            total_games: parsed.totalGames || 0,
            wins: parsed.wins || 0,
            losses: parsed.losses || 0,
            draws: parsed.draws || 0,
            win_rate: parsed.winRate || 0,
            average_accuracy: parsed.averageAccuracy || 0,
            best_accuracy: parsed.bestAccuracy || 0,
            win_streak: parsed.winStreak || 0,
            loss_streak: parsed.lossStreak || 0,
            consecutive_losses: parsed.consecutiveLosses || 0,
            last_updated: new Date().toISOString(),
          };
          setPlayerStats(fallbackStats);
          console.log('Loaded player stats from localStorage fallback:', fallbackStats);
        } else {
          // Create default stats
          const defaultStats: PlayerStatsRecord = {
            id: 1,
            current_elo: 100,
            total_games: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            win_rate: 0,
            average_accuracy: 0,
            best_accuracy: 0,
            win_streak: 0,
            loss_streak: 0,
            consecutive_losses: 0,
            last_updated: new Date().toISOString(),
          };
          setPlayerStats(defaultStats);
          console.log('Created default player stats');
        }
      } catch (fallbackError) {
        console.error('Failed to load from localStorage fallback:', fallbackError);
      }
    }
  };

  // Initialize analysis engine for real-time accuracy computation
  useEffect(() => {
    const initAnalysisEngine = async () => {
      try {
        const { StockfishAnalysis } = await import('@/utils/stockfishAnalysis');
        const engine = new StockfishAnalysis();
        await engine.init();
        setAnalysisEngine(engine);
        console.log('✅ Analysis engine initialized for real-time accuracy');
        
        // Test accuracy functions with known values
        const { winPercentFromCentipawns, moveAccuracyFromWinDelta } = await import('@/utils/accuracy');
        console.log('🧪 Testing accuracy functions:');
        console.log('  - Win% for +100cp:', winPercentFromCentipawns(100));
        console.log('  - Win% for -100cp:', winPercentFromCentipawns(-100));
        console.log('  - Win% for 0cp:', winPercentFromCentipawns(0));
        console.log('  - Accuracy for 50->60 win%:', moveAccuracyFromWinDelta(50, 60));
        console.log('  - Accuracy for 50->40 win%:', moveAccuracyFromWinDelta(50, 40));
        console.log('  - Accuracy for 50->50 win%:', moveAccuracyFromWinDelta(50, 50));
      } catch (e) {
        console.warn('⚠️ Failed to initialize analysis engine:', e);
        console.log('🔄 Will use mock analysis as fallback');
      }
    };
    
    initAnalysisEngine();
    
    return () => {
      if (analysisEngine) {
        analysisEngine.terminate();
      }
    };
  }, []);

  // Analyze move accuracy in real-time using existing Stockfish hook
  const analyzeMoveAccuracy = async (fenBefore: string, fenAfter: string, isPlayerMove: boolean) => {
    if (!isPlayerMove) {
      console.log('🔍 Analysis skipped: not a player move');
      return;
    }
    
    try {
      setIsComputingAccuracy(true);
      console.log('🔍 Starting move accuracy analysis...');
      console.log('🔍 FEN Before:', fenBefore);
      console.log('🔍 FEN After:', fenAfter);
      console.log('🔍 Player Color:', gameState.playerColor);
      
      const { winPercentFromCentipawns, moveAccuracyFromWinDelta } = await import('@/utils/accuracy');
      
      // Try to use real Stockfish analysis, fallback to mock if it fails
      let evalBefore = 0;
      let evalAfter = 0;
      
      try {
        if (analysisEngine) {
          console.log('🔍 Using real Stockfish analysis...');
          
          // Analyze sequentially to avoid concurrent searches
          const evalBeforeResult = await analysisEngine.analyzePosition(fenBefore, 15);
          const evalAfterResult = await analysisEngine.analyzePosition(fenAfter, 15);
          
          evalBefore = evalBeforeResult;
          evalAfter = evalAfterResult;
          
          console.log('🔍 Real Stockfish evaluations:', { evalBefore, evalAfter });
        } else {
          throw new Error('Analysis engine not available');
        }
        
      } catch (stockfishError) {
        console.warn('⚠️ Stockfish analysis failed, using mock:', stockfishError);
        
        // Fallback to mock analysis with more realistic values
        const baseEval = Math.random() * 100 - 50; // -50 to +50 cp base
        const moveImpact = (Math.random() - 0.5) * 200; // -100 to +100 cp move impact
        
        evalBefore = baseEval;
        evalAfter = baseEval + moveImpact;
        
        console.log('🔍 Mock evaluations:', { evalBefore, evalAfter });
      }
      
      console.log('🔍 Final evaluations:', { evalBefore, evalAfter });
      
      // Convert to player's perspective
      const cpCap = 1000;
      const cpBefore = Math.max(-cpCap, Math.min(cpCap, evalBefore));
      const cpAfter = Math.max(-cpCap, Math.min(cpCap, evalAfter));
      
      console.log('🔍 Capped evaluations:', { cpBefore, cpAfter });
      
      const winBeforeWhite = winPercentFromCentipawns(cpBefore);
      const winAfterWhite = winPercentFromCentipawns(cpAfter);
      
      console.log('🔍 White win percentages:', { winBeforeWhite, winAfterWhite });
      
      const winBeforePlayer = gameState.playerColor === 'white' ? winBeforeWhite : 100 - winBeforeWhite;
      const winAfterPlayer = gameState.playerColor === 'white' ? winAfterWhite : 100 - winAfterWhite;
      
      console.log('🔍 Player win percentages:', { winBeforePlayer, winAfterPlayer });
      
      const winDelta = winBeforePlayer - winAfterPlayer;
      console.log('🔍 Win delta:', winDelta);
      
      const moveAccuracy = moveAccuracyFromWinDelta(winBeforePlayer, winAfterPlayer);
      
      console.log('🔍 Move accuracy calculation:');
      console.log('  - Win before:', winBeforePlayer.toFixed(2));
      console.log('  - Win after:', winAfterPlayer.toFixed(2));
      console.log('  - Win delta:', winDelta.toFixed(2));
      console.log('  - Move accuracy:', moveAccuracy.toFixed(2) + '%');
      
      setMoveAccuracies(prev => {
        const newAccuracies = [...prev, moveAccuracy];
        const avgAccuracy = newAccuracies.reduce((sum, acc) => sum + acc, 0) / newAccuracies.length;
        console.log(`📊 Move accuracies so far: [${newAccuracies.map(a => a.toFixed(1)).join(', ')}]`);
        console.log(`📊 Average accuracy: ${avgAccuracy.toFixed(1)}%`);
        return newAccuracies;
      });
      
    } catch (e) {
      console.error('⚠️ Failed to analyze move accuracy:', e);
      if (e instanceof Error) {
        console.error('⚠️ Error details:', e.message, e.stack);
      }
    } finally {
      setIsComputingAccuracy(false);
    }
  };

  const makeMove = (move: string): boolean => {
    console.log('makeMove called with:', move);
    console.log('Database ready:', isDatabaseReady);
    console.log('Current game state:', gameState);
    
    try {
      const chess = new Chess();
      chess.load(gameState.fen);
      const result = chess.move(move);
      
      if (result) {
        console.log('Move successful, updating game state');
        const fenBefore = gameState.fen;
        const newFen = chess.fen();
        const newMoves = [...gameState.moves, move];
        const isPlayerMove = gameState.isPlayerTurn;
        // Block AI response until analysis completes
        if (isPlayerMove) {
          setIsComputingAccuracy(true);
        }

        setGameState(prev => ({
          ...prev,
          fen: newFen,
          moves: newMoves,
          isPlayerTurn: !prev.isPlayerTurn,
        }));

        // Analyze move accuracy in real-time (non-blocking)
        analyzeMoveAccuracy(fenBefore, newFen, isPlayerMove);

        // Check if game is over
        if (chess.isGameOver()) {
          let gameResult: 'white' | 'black' | 'draw';
          if (chess.isCheckmate()) {
            gameResult = chess.turn() === 'w' ? 'black' : 'white';
          } else {
            gameResult = 'draw';
          }
          
          setGameState(prev => ({
            ...prev,
            isGameOver: true,
            result: gameResult,
            isPlayerTurn: false,
          }));
          
          // Update stats when game ends
          // Determine win/loss from player's perspective
          let playerResult: 'win' | 'loss' | 'draw';
          if (gameResult === 'draw') {
            playerResult = 'draw';
          } else if (gameResult === gameState.playerColor) {
            playerResult = 'win'; // Player won
          } else {
            playerResult = 'loss'; // AI won
          }
          
          // Calculate final accuracy from real-time analysis
          const finalAccuracy = moveAccuracies.length > 0 
            ? Math.round((moveAccuracies.reduce((sum, acc) => sum + acc, 0) / moveAccuracies.length) * 10) / 10
            : 85; // Fallback to default
          
          const gameResultForStats: GameResult = {
            result: playerResult,
            moves: newMoves,
            pgn: chess.pgn(),
            accuracy: finalAccuracy,
            blunders: 0,
            mistakes: 0,
            inaccuracies: 0,
            date: new Date().toISOString(),
            isUnrated: gameState.isUnrated,
          };
          
          console.log('🎮 Game over, updating stats:', gameResultForStats);
          console.log('🎮 Final accuracy from real-time analysis:', finalAccuracy);
          updateStats(gameResultForStats);
          
          // Reset move accuracies for next game
          setMoveAccuracies([]);
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Invalid move:', error);
      return false;
    }
  };

  const resetGame = () => {
    setGameState(initialState);
  };

  const startNewGame = () => {
    console.log('=== startNewGame called ===');
    console.log('playerStats:', playerStats);
    console.log('playerStats?.current_elo:', playerStats?.current_elo);
    console.log('gameState before:', gameState);
    
    // Randomly assign player color
    const playerColor: 'white' | 'black' = Math.random() < 0.5 ? 'white' : 'black';
    console.log('playerColor:', playerColor);
    
    // Calculate AI level based on current ELO
    const currentElo = playerStats?.current_elo || 100;
    console.log('currentElo:', currentElo);
    const minElo = 50, maxElo = 2000;
    console.log('minElo:', minElo, 'maxElo:', maxElo);
    const fraction = Math.max(0, Math.min(1, (currentElo - minElo) / (maxElo - minElo)));
    console.log('fraction calculation:', `(${currentElo} - ${minElo}) / (${maxElo} - ${minElo}) = ${(currentElo - minElo)} / ${(maxElo - minElo)} = ${fraction}`);
    const aiLevel = 1 + Math.floor(fraction * 19);
    console.log('aiLevel calculation:', `1 + Math.floor(${fraction} * 19) = 1 + Math.floor(${fraction * 19}) = 1 + ${Math.floor(fraction * 19)} = ${aiLevel}`);
    
    console.log('AI Level Calculation:', {
      currentElo,
      minElo,
      maxElo,
      fraction,
      aiLevel,
      calculation: `(${currentElo} - ${minElo}) / (${maxElo} - ${minElo}) = ${currentElo - minElo} / ${maxElo - minElo} = ${fraction}`,
      levelCalc: `1 + floor(${fraction} * 19) = 1 + floor(${fraction * 19}) = 1 + ${Math.floor(fraction * 19)} = ${aiLevel}`
    });
    
    const newGameState = {
      ...initialState,
      currentElo,
      playerColor,
      aiLevel,
      isPlayerTurn: playerColor === 'white', // White always starts
      isUnrated: false, // Regular rated game
    };
    
    console.log('Setting new game state:', newGameState);
    console.log('Verifying newGameState.aiLevel:', newGameState.aiLevel);
    console.log('Verifying newGameState.currentElo:', newGameState.currentElo);
    setGameState(newGameState);
    
    // Check if state was actually updated
    setTimeout(() => {
      console.log('=== After setGameState ===');
      console.log('gameState after timeout:', gameState);
      console.log('gameState.aiLevel after timeout:', gameState.aiLevel);
    }, 100);
  };

  const startUnratedGame = (aiLevel: number) => {
    console.log('=== startUnratedGame called ===');
    console.log('aiLevel:', aiLevel);
    
    // Randomly assign player color
    const playerColor: 'white' | 'black' = Math.random() < 0.5 ? 'white' : 'black';
    console.log('playerColor:', playerColor);
    
    const currentElo = playerStats?.current_elo || 100;
    
    const newGameState = {
      ...initialState,
      currentElo,
      playerColor,
      aiLevel,
      isPlayerTurn: playerColor === 'white', // White always starts
      isUnrated: true, // Unrated game
    };
    
    console.log('Setting unrated game state:', newGameState);
    setGameState(newGameState);
  };

  const updateStats = async (result: GameResult) => {
    if (!playerStats) return;

    console.log('updateStats called with:', result);
    console.log('Database ready for stats update:', isDatabaseReady);
    console.log('Game is unrated:', result.isUnrated);
    
    const newStats = { ...playerStats };
    
    // Only update stats for rated games
    if (!result.isUnrated) {
      newStats.total_games += 1;
      
      if (result.result === 'win') {
        newStats.wins += 1;
        newStats.win_streak += 1;
        newStats.loss_streak = 0;
        newStats.consecutive_losses = 0;
        
        // Progressive rating increase: 8, 16, 32, 64 (max)
        let eloIncrease = 8;
        if (newStats.win_streak >= 2) eloIncrease = 16;
        if (newStats.win_streak >= 3) eloIncrease = 32;
        if (newStats.win_streak >= 4) eloIncrease = 64;
        
        newStats.current_elo = Math.min(newStats.current_elo + eloIncrease, 2000);
        
      } else if (result.result === 'loss') {
        newStats.losses += 1;
        newStats.win_streak = 0;
        newStats.loss_streak += 1;
        newStats.consecutive_losses += 1;
        
        // Reduce ELO by 8 after every loss (minimum 50)
        newStats.current_elo = Math.max(newStats.current_elo - 8, 50);
        console.log(`📉 ELO reduced by 8 after loss. New ELO: ${newStats.current_elo}`);
        
        // If player failed 3 times in a row, reduce ELO by additional 8
        if (newStats.consecutive_losses >= 3) {
          newStats.current_elo = Math.max(newStats.current_elo - 8, 50);
          newStats.consecutive_losses = 0; // Reset after penalty
          console.log(`📉 Additional ELO reduction for 3 consecutive losses. New ELO: ${newStats.current_elo}`);
        }
        
      } else {
        newStats.draws += 1;
        newStats.win_streak = 0;
        newStats.loss_streak = 0;
        newStats.consecutive_losses = 0;
      }
      
      newStats.win_rate = (newStats.wins / newStats.total_games) * 100;
      
      // Update average accuracy
      const gameStats = await databaseService.getGameStats();
      newStats.average_accuracy = gameStats.averageAccuracy;
      
      // Update best accuracy
      newStats.best_accuracy = Math.max(newStats.best_accuracy, result.accuracy);
      
      // Update local state first
      setPlayerStats(newStats);
      console.log('Stats updated locally:', newStats);
    } else {
      console.log('🎮 Unrated game - skipping ELO and stats updates');
    }
    
    // Save to database if ready
    if (isDatabaseReady) {
      try {
        if (!result.isUnrated) {
          await databaseService.updatePlayerStats(newStats);
        }
        
        // Save game record (always save, but mark as unrated)
        const gameRecord: GameRecord = {
          result: result.result,
          moves: result.moves,
          pgn: result.pgn,
          accuracy: result.accuracy,
          blunders: result.blunders,
          mistakes: result.mistakes,
          inaccuracies: result.inaccuracies,
          date: result.date,
          elo_before: playerStats.current_elo,
          elo_after: result.isUnrated ? playerStats.current_elo : newStats.current_elo,
          win_streak: result.isUnrated ? playerStats.win_streak : newStats.win_streak,
          loss_streak: result.isUnrated ? playerStats.loss_streak : newStats.loss_streak,
          player_color: gameState.playerColor,
          ai_level: gameState.aiLevel,
          isUnrated: result.isUnrated,
        };
        
        console.log('💾 Saving game record to database:', gameRecord);
        await databaseService.saveGame(gameRecord);
        console.log('✅ Game saved to database successfully');
        if (!result.isUnrated) {
          console.log('✅ Stats saved to database:', newStats);
        }
      } catch (error) {
        console.error('Failed to update stats in database:', error);
        console.log('Continuing with local state only');
      }
    } else {
      console.log('Database not ready, stats saved locally only');
    }
  };

  const setStockfishElo = (elo: number) => {
    setStockfishConfig(prev => ({ ...prev, elo }));
    if (playerStats) {
      const updatedStats = { ...playerStats, current_elo: elo };
      setPlayerStats(updatedStats);
      databaseService.updatePlayerStats(updatedStats);
    }
  };

  const saveGame = async (game: GameRecord) => {
    try {
      await databaseService.saveGame(game);
    } catch (error) {
      console.error('Failed to save game:', error);
    }
  };

  const getGames = async (limit: number = 50, offset: number = 0) => {
    try {
      return await databaseService.getGames(limit, offset);
    } catch (error) {
      console.error('Failed to get games:', error);
      return [];
    }
  };

  const exportData = async () => {
    try {
      return await databaseService.exportData();
    } catch (error) {
      console.error('Failed to export data:', error);
      return { games: [], playerStats: null };
    }
  };

  const importData = async (data: { games: GameRecord[]; playerStats: PlayerStatsRecord | null }) => {
    try {
      await databaseService.importData(data);
      await loadPlayerStats();
    } catch (error) {
      console.error('Failed to import data:', error);
    }
  };

  const value: DatabaseContextType = {
    gameState,
    playerStats,
    stockfishConfig,
    isDatabaseReady,
    makeMove,
    resetGame,
    startNewGame,
    startUnratedGame,
    updateStats,
    setStockfishElo,
    loadPlayerStats,
    isComputingAccuracy,
    moveAccuracies,
    saveGame,
    getGames,
    exportData,
    importData,
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
}
