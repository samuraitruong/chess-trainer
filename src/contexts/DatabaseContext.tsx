'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { databaseService, GameRecord, PlayerStatsRecord } from '@/services/database';
import { GameState, GameResult, StockfishConfig } from '@/types/chess';
import { Chess } from 'chess.js';

interface DatabaseContextType {
  gameState: GameState;
  playerStats: PlayerStatsRecord | null;
  stockfishConfig: StockfishConfig;
  isDatabaseReady: boolean;
  makeMove: (move: string) => boolean;
  resetGame: () => void;
  startNewGame: () => void;
  updateStats: (result: GameResult) => void;
  setStockfishElo: (elo: number) => void;
  loadPlayerStats: () => Promise<void>;
  saveGame: (game: GameRecord) => Promise<void>;
  getGames: (limit?: number, offset?: number) => Promise<GameRecord[]>;
  exportData: () => Promise<{ games: GameRecord[]; playerStats: PlayerStatsRecord | null }>;
  importData: (data: { games: GameRecord[]; playerStats: PlayerStatsRecord | null }) => Promise<void>;
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

  // Initialize database on mount
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        console.log('Starting database initialization...');
        await databaseService.initialize();
        
        // Test the database to ensure it's working
        const testResult = await databaseService.testDatabase();
        if (testResult) {
          setIsDatabaseReady(true);
          await loadPlayerStats();
          console.log('Database initialized and tested successfully');
        } else {
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
    if (playerStats) {
      setStockfishConfig(prev => ({ ...prev, elo: playerStats.current_elo }));
      console.log('Updated stockfishConfig.elo to:', playerStats.current_elo);
    }
  }, [playerStats?.current_elo]);

  const loadPlayerStats = async () => {
    try {
      const stats = await databaseService.getPlayerStats();
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
        const newFen = chess.fen();
        const newMoves = [...gameState.moves, move];
        
        setGameState(prev => ({
          ...prev,
          fen: newFen,
          moves: newMoves,
          isPlayerTurn: !prev.isPlayerTurn,
        }));

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
          const gameResultForStats: GameResult = {
            result: gameResult === 'white' ? 'win' : gameResult === 'black' ? 'loss' : 'draw',
            moves: newMoves,
            pgn: chess.pgn(),
            accuracy: 85, // Default accuracy, could be calculated
            blunders: 0,
            mistakes: 0,
            inaccuracies: 0,
            date: new Date().toISOString(),
          };
          
          console.log('🎮 Game over, updating stats:', gameResultForStats);
          console.log('🎮 Database ready for game save:', isDatabaseReady);
          updateStats(gameResultForStats);
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
    setGameState({
      ...initialState,
      currentElo: playerStats?.current_elo || 100,
    });
  };

  const updateStats = async (result: GameResult) => {
    if (!playerStats) return;

    console.log('updateStats called with:', result);
    console.log('Database ready for stats update:', isDatabaseReady);
    
    const newStats = { ...playerStats };
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
    
    // Save to database if ready
    if (isDatabaseReady) {
      try {
        await databaseService.updatePlayerStats(newStats);
        
        // Save game record
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
          elo_after: newStats.current_elo,
          win_streak: newStats.win_streak,
          loss_streak: newStats.loss_streak,
        };
        
        console.log('💾 Saving game record to database:', gameRecord);
        await databaseService.saveGame(gameRecord);
        console.log('✅ Game saved to database successfully');
        console.log('✅ Stats saved to database:', newStats);
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
    updateStats,
    setStockfishElo,
    loadPlayerStats,
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
