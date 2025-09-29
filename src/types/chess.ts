export interface GameResult {
  result: 'win' | 'loss' | 'draw';
  moves: string[];
  pgn: string;
  accuracy: number;
  blunders: number;
  mistakes: number;
  inaccuracies: number;
  date: string;
}

export interface PlayerStats {
  currentElo: number;
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  averageAccuracy: number;
  bestAccuracy: number;
  gamesHistory: GameResult[];
  winStreak: number;
  lossStreak: number;
  consecutiveLosses: number;
}

export interface GameState {
  fen: string;
  moves: string[];
  isGameOver: boolean;
  result: 'white' | 'black' | 'draw' | null;
  isPlayerTurn: boolean;
  isThinking: boolean;
  currentElo: number;
}

export interface MoveAnalysis {
  move: string;
  evaluation: number;
  bestMove: string;
  isBlunder: boolean;
  isMistake: boolean;
  isInaccuracy: boolean;
  comment: string;
}

export interface StockfishConfig {
  elo: number;
  depth: number;
  timeLimit: number;
}
