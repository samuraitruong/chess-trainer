'use client';

import React, { useState, useEffect } from 'react';
import { useDatabase } from '@/contexts/DatabaseContext';
import { GameRecord } from '@/services/database';
import GameReview from './GameReview';

export default function Dashboard() {
  const { playerStats, getGames } = useDatabase();
  const [games, setGames] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameRecord | null>(null);

  useEffect(() => {
    const loadGames = async () => {
      try {
        setLoading(true);
        console.log('🔄 Dashboard: Loading games...');
        const gamesData = await getGames(50); // Load last 50 games
        setGames(gamesData);
        console.log('📊 Dashboard: Loaded games:', gamesData);
        console.log('📊 Dashboard: Number of games:', gamesData.length);
      } catch (error) {
        console.error('❌ Dashboard: Failed to load games:', error);
      } finally {
        setLoading(false);
      }
    };

    loadGames();
  }, [getGames]);

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getPerformanceColor = (winRate: number) => {
    if (winRate >= 70) return 'text-green-600';
    if (winRate >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return 'text-green-600';
    if (accuracy >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  

  const handleReviewGame = (game: GameRecord) => {
    setSelectedGame(game);
    setShowReview(true);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Your Progress</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Current Elo */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Current AI Level</p>
              <p className="text-2xl font-bold text-blue-800">{playerStats?.current_elo || 0}</p>
            </div>
            <div className="text-blue-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Win Rate */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Win Rate</p>
              <p className={`text-2xl font-bold ${getPerformanceColor(playerStats?.win_rate || 0)}`}>
                {formatPercentage(playerStats?.win_rate || 0)}
              </p>
            </div>
            <div className="text-green-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        {/* Average Accuracy */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Avg Accuracy</p>
              <p className={`text-2xl font-bold ${getAccuracyColor(playerStats?.average_accuracy || 0)}`}>
                {formatPercentage(playerStats?.average_accuracy || 0)}
              </p>
            </div>
            <div className="text-purple-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Games */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Games Played</p>
              <p className="text-2xl font-bold text-orange-800">{playerStats?.total_games || 0}</p>
            </div>
            <div className="text-orange-500">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2L3 7v11a1 1 0 001 1h12a1 1 0 001-1V7l-7-5zM8 15a1 1 0 11-2 0 1 1 0 012 0zm4 0a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Streak Information */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Current Streaks</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Win Streak</p>
                <p className="text-2xl font-bold text-green-800">{playerStats?.win_streak || 0}</p>
              </div>
              <div className="text-green-500">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Loss Streak</p>
                <p className="text-2xl font-bold text-red-800">{playerStats?.loss_streak || 0}</p>
              </div>
              <div className="text-red-500">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Game History Summary */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Game History</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{playerStats?.wins || 0}</div>
            <div className="text-sm text-gray-600">Wins</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{playerStats?.losses || 0}</div>
            <div className="text-sm text-gray-600">Losses</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{playerStats?.draws || 0}</div>
            <div className="text-sm text-gray-600">Draws</div>
          </div>
        </div>
      </div>

      {/* Best Performance */}
      {playerStats?.best_accuracy && playerStats.best_accuracy > 0 && (
        <div className="mt-6 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">Best Accuracy</p>
              <p className="text-xl font-bold text-yellow-800">
                {formatPercentage(playerStats.best_accuracy)}
              </p>
            </div>
            <div className="text-yellow-500">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
          </div>
        </div>
      )}

      

      {/* Recent Games */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Games</h3>
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading games...</p>
          </div>
        ) : games.length > 0 ? (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {games.map((game, index) => (
              <div key={game.id || index} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div className="text-sm font-medium text-gray-900">
                        Game #{game.id || index + 1}
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        game.result === 'win' ? 'bg-green-100 text-green-800' :
                        game.result === 'loss' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {game.result === 'win' ? '1-0' : game.result === 'loss' ? '0-1' : '½-½'}
                      </div>
                      <div className="text-sm text-gray-600">
                        {game.moves?.length || 0} moves
                      </div>
                    </div>
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                      <span>Accuracy: {formatPercentage(game.accuracy || 0)}</span>
                      {game.elo_before && game.elo_after && (
                        <span className={`${
                          game.elo_after > game.elo_before ? 'text-green-600' : 
                          game.elo_after < game.elo_before ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          ELO: {game.elo_before} → {game.elo_after}
                        </span>
                      )}
                      <span>{new Date(game.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <button 
                      onClick={() => handleReviewGame(game)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Review →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No games played yet</p>
            <p className="text-sm">Start playing to see your game history here!</p>
          </div>
        )}
      </div>

      {/* Game Review Modal */}
      {selectedGame && (
        <GameReview 
          isOpen={showReview} 
          onClose={() => {
            setShowReview(false);
            setSelectedGame(null);
          }}
          game={selectedGame}
        />
      )}
    </div>
  );
}
