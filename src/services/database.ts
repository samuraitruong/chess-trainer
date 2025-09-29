import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface GameRecord {
  id?: number;
  result: 'win' | 'loss' | 'draw';
  moves: string[];
  pgn: string;
  accuracy: number;
  blunders: number;
  mistakes: number;
  inaccuracies: number;
  date: string;
  elo_before: number;
  elo_after: number;
  win_streak: number;
  loss_streak: number;
}

export interface PlayerStatsRecord {
  id: number;
  current_elo: number;
  total_games: number;
  wins: number;
  losses: number;
  draws: number;
  win_rate: number;
  average_accuracy: number;
  best_accuracy: number;
  win_streak: number;
  loss_streak: number;
  consecutive_losses: number;
  last_updated: string;
}

interface ChessTrainerDB extends DBSchema {
  games: {
    key: number;
    value: GameRecord;
    indexes: { 'by-date': string };
  };
  playerStats: {
    key: number;
    value: PlayerStatsRecord;
  };
}

class DatabaseService {
  private db: IDBPDatabase<ChessTrainerDB> | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      console.log('🔧 Initializing IndexedDB database...');
      
      if (typeof window === 'undefined') {
        throw new Error('IndexedDB requires browser environment');
      }

      this.db = await openDB<ChessTrainerDB>('chess-trainer', 1, {
        upgrade(db) {
          console.log('🔧 Creating database schema...');
          
          // Create games store
          if (!db.objectStoreNames.contains('games')) {
            const gamesStore = db.createObjectStore('games', { keyPath: 'id', autoIncrement: true });
            gamesStore.createIndex('by-date', 'date');
            console.log('✅ Games store created');
          }
          
          // Create playerStats store
          if (!db.objectStoreNames.contains('playerStats')) {
            db.createObjectStore('playerStats', { keyPath: 'id' });
            console.log('✅ Player stats store created');
          }
        },
      });

      console.log('✅ IndexedDB database opened successfully');

      // Initialize default player stats if they don't exist
      await this.initializeDefaultStats();
      
      this.isInitialized = true;
      console.log('✅ Database setup complete');
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      throw error;
    }
  }

  private async initializeDefaultStats(): Promise<void> {
    if (!this.db) return;
    
    try {
      const existingStats = await this.db.get('playerStats', 1);
      if (!existingStats) {
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
        
        await this.db.put('playerStats', defaultStats);
        console.log('✅ Default player stats created');
      } else {
        console.log('✅ Player stats already exist');
      }
    } catch (error) {
      console.error('❌ Failed to initialize default stats:', error);
    }
  }

  async saveGame(game: GameRecord): Promise<number> {
    if (!this.isInitialized) await this.initialize();
    if (!this.db) throw new Error('Database not initialized');
    
    try {
      console.log('💾 DatabaseService: Saving game:', game);
      
      const id = await this.db.add('games', game);
      console.log('✅ DatabaseService: Game saved successfully with ID:', id);
      return id as number;
    } catch (error) {
      console.error('❌ DatabaseService: Failed to save game:', error);
      throw error;
    }
  }

  async updatePlayerStats(stats: PlayerStatsRecord): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    if (!this.db) throw new Error('Database not initialized');
    
    try {
      console.log('💾 DatabaseService: Updating player stats:', stats);
      
      await this.db.put('playerStats', stats);
      console.log('✅ DatabaseService: Player stats updated successfully');
    } catch (error) {
      console.error('❌ DatabaseService: Failed to update player stats:', error);
      throw error;
    }
  }

  async getPlayerStats(): Promise<PlayerStatsRecord | null> {
    if (!this.isInitialized) await this.initialize();
    if (!this.db) return null;
    
    try {
      const stats = await this.db.get('playerStats', 1);
      return stats || null;
    } catch (error) {
      console.error('❌ Failed to get player stats:', error);
      return null;
    }
  }

  async getGames(limit: number = 50, offset: number = 0): Promise<GameRecord[]> {
    if (!this.isInitialized) await this.initialize();
    if (!this.db) return [];
    
    try {
      console.log('📊 DatabaseService: Getting games, limit:', limit, 'offset:', offset);
      
      // Get all games, sorted by date (newest first)
      const allGames = await this.db.getAllFromIndex('games', 'by-date');
      
      // Reverse to get newest first (IndexedDB sorts ascending by default)
      const sortedGames = allGames.reverse();
      
      // Apply pagination
      const games = sortedGames.slice(offset, offset + limit);
      
      console.log('📊 DatabaseService: Processed games:', games);
      return games;
    } catch (error) {
      console.error('❌ DatabaseService: Failed to get games:', error);
      return [];
    }
  }

  async getGameById(id: number): Promise<GameRecord | null> {
    if (!this.isInitialized) await this.initialize();
    if (!this.db) return null;
    
    try {
      const game = await this.db.get('games', id);
      return game || null;
    } catch (error) {
      console.error('❌ Failed to get game by ID:', error);
      return null;
    }
  }

  async getGameStats(): Promise<{
    totalGames: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
    averageAccuracy: number;
    bestAccuracy: number;
  }> {
    if (!this.isInitialized) await this.initialize();
    if (!this.db) {
      return {
        totalGames: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        averageAccuracy: 0,
        bestAccuracy: 0,
      };
    }
    
    try {
      const allGames = await this.db.getAll('games');
      
      const totalGames = allGames.length;
      const wins = allGames.filter(g => g.result === 'win').length;
      const losses = allGames.filter(g => g.result === 'loss').length;
      const draws = allGames.filter(g => g.result === 'draw').length;
      const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;
      const averageAccuracy = totalGames > 0 ? allGames.reduce((sum, g) => sum + g.accuracy, 0) / totalGames : 0;
      const bestAccuracy = totalGames > 0 ? Math.max(...allGames.map(g => g.accuracy)) : 0;
      
      return {
        totalGames,
        wins,
        losses,
        draws,
        winRate,
        averageAccuracy,
        bestAccuracy,
      };
    } catch (error) {
      console.error('❌ Failed to get game stats:', error);
      return {
        totalGames: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        averageAccuracy: 0,
        bestAccuracy: 0,
      };
    }
  }

  async clearAllData(): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    if (!this.db) return;
    
    await this.db.clear('games');
    await this.db.clear('playerStats');
    await this.initializeDefaultStats();
  }

  async exportData(): Promise<{ games: GameRecord[]; playerStats: PlayerStatsRecord | null }> {
    if (!this.isInitialized) await this.initialize();
    if (!this.db) return { games: [], playerStats: null };
    
    const games = await this.getGames(1000);
    const playerStats = await this.getPlayerStats();
    
    return { games, playerStats };
  }

  async importData(data: { games: GameRecord[]; playerStats: PlayerStatsRecord | null }): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    if (!this.db) return;
    
    await this.clearAllData();
    
    if (data.playerStats) {
      await this.updatePlayerStats(data.playerStats);
    }
    
    for (const game of data.games) {
      await this.saveGame(game);
    }
  }

  async testDatabase(): Promise<boolean> {
    try {
      await this.initialize();
      const stats = await this.getPlayerStats();
      return stats !== null;
    } catch (error) {
      console.error('Database test failed:', error);
      return false;
    }
  }
}

export const databaseService = new DatabaseService();