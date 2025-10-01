'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Chess } from 'chess.js';
import { GameState, PlayerStats, GameResult, StockfishConfig } from '@/types/chess';

interface GameContextType {
  gameState: GameState;
  playerStats: PlayerStats;
  stockfishConfig: StockfishConfig;
  makeMove: (move: string) => boolean;
  resetGame: () => void;
  startNewGame: () => void;
  updateStats: (result: GameResult) => void;
  setStockfishElo: (elo: number) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

type GameAction =
  | { type: 'MAKE_MOVE'; payload: { move: string; fen: string } }
  | { type: 'GAME_OVER'; payload: { result: 'white' | 'black' | 'draw' } }
  | { type: 'RESET_GAME' }
  | { type: 'START_NEW_GAME' }
  | { type: 'SET_THINKING'; payload: boolean }
  | { type: 'UPDATE_STATS'; payload: GameResult }
  | { type: 'SET_ELO'; payload: number }
  | { type: 'LOAD_STATS'; payload: PlayerStats };

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

const initialStats: PlayerStats = {
  currentElo: 100,
  totalGames: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  winRate: 0,
  averageAccuracy: 0,
  bestAccuracy: 0,
  gamesHistory: [],
  winStreak: 0,
  lossStreak: 0,
  consecutiveLosses: 0,
};

const initialStockfishConfig: StockfishConfig = {
  elo: 100,
  depth: 15,
  timeLimit: 1000,
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'MAKE_MOVE':
      return {
        ...state,
        fen: action.payload.fen,
        moves: [...state.moves, action.payload.move],
        isPlayerTurn: !state.isPlayerTurn,
      };
    case 'GAME_OVER':
      return {
        ...state,
        isGameOver: true,
        result: action.payload.result,
        isPlayerTurn: false,
      };
    case 'RESET_GAME':
      return initialState;
    case 'START_NEW_GAME':
      return {
        ...initialState,
        currentElo: state.currentElo,
      };
    case 'SET_THINKING':
      return {
        ...state,
        isThinking: action.payload,
      };
    default:
      return state;
  }
}

function statsReducer(state: PlayerStats, action: GameAction): PlayerStats {
  console.log('statsReducer called with action:', action.type);
  switch (action.type) {
    case 'UPDATE_STATS':
      console.log('UPDATE_STATS payload:', action.payload);
      const newStats = { ...state };
      newStats.totalGames += 1;
      
      if (action.payload.result === 'win') {
        newStats.wins += 1;
        newStats.winStreak += 1;
        newStats.lossStreak = 0;
        newStats.consecutiveLosses = 0;
        
        // Progressive rating increase: 8, 16, 32, 64 (max)
        let eloIncrease = 8;
        if (newStats.winStreak >= 2) eloIncrease = 16;
        if (newStats.winStreak >= 3) eloIncrease = 32;
        if (newStats.winStreak >= 4) eloIncrease = 64;
        
        newStats.currentElo = Math.min(newStats.currentElo + eloIncrease, 2000);
        
      } else if (action.payload.result === 'loss') {
        newStats.losses += 1;
        newStats.winStreak = 0;
        newStats.lossStreak += 1;
        newStats.consecutiveLosses += 1;
        
        // Reduce ELO by 8 after every loss (minimum 50)
        newStats.currentElo = Math.max(newStats.currentElo - 8, 50);
        console.log(`📉 ELO reduced by 8 after loss. New ELO: ${newStats.currentElo}`);
        
        // If player failed 3 times in a row, reduce ELO by additional 8
        if (newStats.consecutiveLosses >= 3) {
          newStats.currentElo = Math.max(newStats.currentElo - 8, 50);
          newStats.consecutiveLosses = 0; // Reset after penalty
          console.log(`📉 Additional ELO reduction for 3 consecutive losses. New ELO: ${newStats.currentElo}`);
        }
        
      } else {
        newStats.draws += 1;
        newStats.winStreak = 0;
        newStats.lossStreak = 0;
        newStats.consecutiveLosses = 0;
      }
      
      newStats.winRate = (newStats.wins / newStats.totalGames) * 100;
      newStats.gamesHistory.push(action.payload);
      
      // Update average accuracy
      const totalAccuracy = newStats.gamesHistory.reduce((sum, game) => sum + game.accuracy, 0);
      newStats.averageAccuracy = totalAccuracy / newStats.gamesHistory.length;
      
      // Update best accuracy
      newStats.bestAccuracy = Math.max(newStats.bestAccuracy, action.payload.accuracy);
      
      console.log('Final newStats:', newStats);
      return newStats;
    case 'SET_ELO':
      return {
        ...state,
        currentElo: action.payload,
      };
    case 'LOAD_STATS':
      console.log('Loading complete stats from localStorage:', action.payload);
      return {
        ...action.payload,
      };
    default:
      return state;
  }
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameState, gameDispatch] = useReducer(gameReducer, initialState);
  const [playerStats, statsDispatch] = useReducer(statsReducer, initialStats);
  const [stockfishConfig, setStockfishConfig] = React.useState<StockfishConfig>(initialStockfishConfig);

  // Load stats from localStorage on mount
  useEffect(() => {
    const savedStats = localStorage.getItem('chess-trainer-stats');
    if (savedStats) {
      const parsed = JSON.parse(savedStats);
      console.log('Loading saved stats from localStorage:', parsed);
      // Load all stats, not just ELO
      if (parsed.currentElo) {
        statsDispatch({ type: 'SET_ELO', payload: parsed.currentElo });
      }
      if (parsed.totalGames) {
        // We need to create a custom action to load all stats
        statsDispatch({ type: 'LOAD_STATS', payload: parsed });
      }
    }
  }, []);

  // Save stats to localStorage when they change
  useEffect(() => {
    localStorage.setItem('chess-trainer-stats', JSON.stringify(playerStats));
  }, [playerStats]);

  // Update stockfishConfig when playerStats.currentElo changes
  useEffect(() => {
    setStockfishConfig(prev => ({ ...prev, elo: playerStats.currentElo }));
    console.log('Updated stockfishConfig.elo to:', playerStats.currentElo);
  }, [playerStats.currentElo]);

  const makeMove = (move: string): boolean => {
    console.log('makeMove called with:', move);
    console.log('Current game state:', gameState);
    
    try {
      const chess = new Chess(gameState.fen);
      const result = chess.move(move);
      
      if (result) {
        console.log('Move successful, dispatching MAKE_MOVE');
        gameDispatch({
          type: 'MAKE_MOVE',
          payload: { move: move, fen: chess.fen() },
        });

        // Check if game is over
        if (chess.isGameOver()) {
          let gameResult: 'white' | 'black' | 'draw';
          if (chess.isCheckmate()) {
            gameResult = chess.turn() === 'w' ? 'black' : 'white';
          } else {
            gameResult = 'draw';
          }
          gameDispatch({ type: 'GAME_OVER', payload: { result: gameResult } });
          
          // Update stats when game ends
          const gameResultForStats: GameResult = {
            result: gameResult === 'white' ? 'win' : gameResult === 'black' ? 'loss' : 'draw',
            moves: [...gameState.moves, move],
            pgn: chess.pgn(),
            accuracy: 85, // Default accuracy, could be calculated
            blunders: 0,
            mistakes: 0,
            inaccuracies: 0,
            date: new Date().toISOString(),
          };
          
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
    gameDispatch({ type: 'RESET_GAME' });
  };

  const startNewGame = () => {
    gameDispatch({ type: 'START_NEW_GAME' });
  };

  const updateStats = (result: GameResult) => {
    console.log('updateStats called with:', result);
    statsDispatch({ type: 'UPDATE_STATS', payload: result });
  };

  const setStockfishElo = (elo: number) => {
    setStockfishConfig(prev => ({ ...prev, elo }));
    statsDispatch({ type: 'SET_ELO', payload: elo });
  };

  return (
    <GameContext.Provider
      value={{
        gameState,
        playerStats,
        stockfishConfig,
        makeMove,
        resetGame,
        startNewGame,
        updateStats,
        setStockfishElo,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
