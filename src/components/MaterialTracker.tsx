'use client';

import React, { useMemo, useState } from 'react';
import { Chess, Move } from 'chess.js';
import { useDatabase } from '@/contexts/DatabaseContext';
import { getLevelProfile } from '@/utils/levelConfig';
import { FaChessPawn, FaChessKnight, FaChessBishop, FaChessRook, FaChessQueen } from 'react-icons/fa';

type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

const PIECE_VALUES: Record<PieceType, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

const PieceIcon: Record<Exclude<PieceType, 'k'>, React.ReactNode> = {
  p: <FaChessPawn className="inline-block" />,
  n: <FaChessKnight className="inline-block" />,
  b: <FaChessBishop className="inline-block" />,
  r: <FaChessRook className="inline-block" />,
  q: <FaChessQueen className="inline-block" />,
};

function CapturedIcons({ counts, align = 'left', pieceColor = 'white' }: { 
  counts: Partial<Record<PieceType, number>>; 
  align?: 'left' | 'right';
  pieceColor?: 'white' | 'black';
}) {
  const order: PieceType[] = ['q', 'r', 'b', 'n', 'p'];
  
  // Different colors for white vs black pieces
  const textColor = pieceColor === 'white' ? 'text-gray-800' : 'text-gray-500';
  const countColor = pieceColor === 'white' ? 'text-gray-700' : 'text-gray-600';

  return (
    <div className={`flex flex-row flex-wrap gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
      {order.map((pt) => {
        const count = counts[pt];
        if (!count || count <= 0 || pt === 'k') return null;
        return (
          <span key={pt} className={`relative inline-flex items-center justify-center ${textColor}`}>
            <span className="text-sm">{PieceIcon[pt as Exclude<PieceType, 'k'>]}</span>
            {count > 1 && (
              <span className={`ml-0.5 text-[10px] ${countColor}`}>x{count}</span>
            )}
          </span>
        );
      })}
    </div>
  );
}

export default function MaterialTracker({ side, noBorder = false }: { side: 'white' | 'black'; noBorder?: boolean }) {
  const { gameState, stockfishConfig } = useDatabase();
  const [showConfig, setShowConfig] = useState(false);
  const [showSloganPopup, setShowSloganPopup] = useState(false);

  const { whiteCaptured, blackCaptured, whiteMaterial, blackMaterial } = useMemo(() => {
    const chess = new Chess();
    const whiteCapturedCounts: Partial<Record<PieceType, number>> = {};
    const blackCapturedCounts: Partial<Record<PieceType, number>> = {};
    let whiteMat = 0;
    let blackMat = 0;

    for (const san of gameState.moves) {
      try {
        const mv = chess.move(san) as Move | null;
        if (mv && mv.captured) {
          const capturedType = (mv.captured || '').toLowerCase() as PieceType;
          const moverColor = mv.color as 'w' | 'b';
          const val = PIECE_VALUES[capturedType] || 0;
          if (moverColor === 'w') {
            whiteCapturedCounts[capturedType] = (whiteCapturedCounts[capturedType] || 0) + 1;
            whiteMat += val;
          } else {
            blackCapturedCounts[capturedType] = (blackCapturedCounts[capturedType] || 0) + 1;
            blackMat += val;
          }
        }
      } catch {
        // ignore invalid SANs
      }
    }

    return {
      whiteCaptured: whiteCapturedCounts,
      blackCaptured: blackCapturedCounts,
      whiteMaterial: whiteMat,
      blackMaterial: blackMat,
    };
  }, [gameState.moves]);

  const materialDiff = whiteMaterial - blackMaterial; // positive -> white up
  const isWhite = side === 'white';
  
  // New logic: AI is always on top, Player is always on bottom
  // In SimpleChessBoard: AI is top, Player is bottom
  const isPlayerSide = side === gameState.playerColor;
  
  const levelFromElo = (elo: number) => {
    const minElo = 50, maxElo = 2000;
    const fraction = Math.max(0, Math.min(1, (elo - minElo) / (maxElo - minElo)));
    return 1 + Math.floor(fraction * 19);
  };
  
  const aiLabel = React.useMemo(() => {
    if (!isPlayerSide) {
      const lvl = gameState.aiLevel;
      const profile = getLevelProfile(lvl);
      return profile.animalName;
    }
    return 'Player';
  }, [isPlayerSide, gameState.aiLevel, side, gameState.playerColor]);

  const aiImage = React.useMemo(() => {
    if (!isPlayerSide) {
      const lvl = gameState.aiLevel;
      const profile = getLevelProfile(lvl);
      return `/ai/set1/${profile.animalName}.png`;
    }
    return null;
  }, [isPlayerSide, gameState.aiLevel]);
  const showPlus = (isWhite && materialDiff > 0) || (!isWhite && materialDiff < 0);
  const plusVal = isWhite ? materialDiff : Math.abs(materialDiff);
  const counts = isWhite ? whiteCaptured : blackCaptured;
  // Player is always on the left, AI is always on the right
  // Player should always be on the left, AI always on the right
  const align = isPlayerSide ? 'left' : 'right';

  const derived = useMemo(() => {
    const elo = stockfishConfig.elo;
    const lvl = levelFromElo(elo);
    const profile = getLevelProfile(lvl);
    
    if (profile.play.kind === 'mistake') {
      return {
        mode: 'Low ELO (realistic mistakes)',
        uciLimitStrength: false,
        multipv: profile.play.multipv,
        threads: 1,
        hash: 1,
        depth: profile.play.depthCap,
        timeLabel: `≈${profile.play.timeMinMs}–${profile.play.timeMaxMs} ms`,
        probabilities: {
          best: Math.round(profile.play.bestProb * 100),
          second: Math.round(profile.play.secondProb * 100),
          third: Math.round(profile.play.thirdProb * 100),
          random: Math.round(profile.play.randomProb * 100),
        }
      } as const;
    } else {
      const time = profile.play.timeMs;
      return {
        mode: 'UCI_LimitStrength',
        uciLimitStrength: true,
        multipv: 1,
        threads: 'default',
        hash: 'default',
        depth: undefined,
        timeLabel: `${time} ms`,
        uciElo: profile.play.uciElo,
        probabilities: null
      } as const;
    }
  }, [stockfishConfig.elo]);

  // Random slogan popup logic for AI side
  React.useEffect(() => {
    if (!isPlayerSide && gameState.isPlayerTurn && !gameState.isThinking && gameState.moves.length > 0) {
      // 15% chance to show slogan popup
      if (Math.random() < 0.15) {
        setShowSloganPopup(true);
        
        // Hide after 3 seconds
        const timer = setTimeout(() => {
          setShowSloganPopup(false);
        }, 3000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [isPlayerSide, gameState.isPlayerTurn, gameState.isThinking, gameState.moves.length]);

  return (
    <div className={`w-full px-3 py-2 ${noBorder ? '' : 'bg-white/70 border rounded-md'}`}>
      <div className={`flex ${isPlayerSide ? 'flex-row' : 'flex-row-reverse'} items-center justify-between`}>
        <div className="relative">
          <button
            type="button"
            className="text-sm font-semibold text-gray-800 hover:text-blue-700 flex items-center gap-2"
            onClick={() => {
              if (side === 'black') setShowConfig(true);
            }}
          >
            {aiImage && (
              <img 
                src={aiImage} 
                alt={aiLabel}
                className="w-6 h-6 object-cover rounded-full border border-gray-300"
                onError={(e) => {
                  // Hide image if it fails to load
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            {aiLabel}
          </button>
          
          {/* Slogan Popup for AI side */}
          {!isPlayerSide && showSloganPopup && (
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-yellow-100 border-2 border-yellow-300 rounded-lg px-2 py-1 shadow-lg animate-bounce z-10 max-w-xs">
              <div className="text-xs font-bold text-yellow-800 text-center whitespace-nowrap">
                {(() => {
                  const lvl = levelFromElo(stockfishConfig.elo);
                  const profile = getLevelProfile(lvl);
                  return profile.slogan;
                })()}
              </div>
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                <div className="w-0 h-0 border-l-2 border-r-2 border-t-2 border-l-transparent border-r-transparent border-t-yellow-300"></div>
              </div>
            </div>
          )}
        </div>
        {showPlus && <span className="text-xs font-bold text-green-700">+{plusVal}</span>}
      </div>
      <div className={`mt-1 ${align === 'right' ? 'text-right' : ''}`}>
        <CapturedIcons 
          counts={counts} 
          align={align as 'left' | 'right'} 
          pieceColor={side}
        />
      </div>
      {side === 'black' && showConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowConfig(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl p-4">
            {/* Animal Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <img 
                    src={aiImage || '/ai/set1/Chick.png'} 
                    alt="AI Avatar"
                    className="w-12 h-12 object-cover rounded-full border-2 border-blue-300 shadow-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {(() => {
                      const lvl = levelFromElo(stockfishConfig.elo);
                      const profile = getLevelProfile(lvl);
                      return profile.animalName;
                    })()}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Level {levelFromElo(stockfishConfig.elo)} • ELO {stockfishConfig.elo}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
                onClick={() => setShowConfig(false)}
              >
                ✕
              </button>
            </div>
            
            {/* Slogan */}
            <div className="mb-6 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 italic text-center">
                &ldquo;{(() => {
                  const lvl = levelFromElo(stockfishConfig.elo);
                  const profile = getLevelProfile(lvl);
                  return profile.slogan;
                })()}&rdquo;
              </p>
            </div>
            
            {/* Technical Details in Grid Layout */}
            <div className="space-y-4">
              {/* Engine Configuration */}
              <div className="bg-blue-50 p-3 rounded-lg">
                <h5 className="text-sm font-semibold text-blue-800 mb-2">Engine Configuration</h5>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-700 font-medium">Engine</span><span className="font-semibold text-gray-900">Stockfish (WASM)</span></div>
                  <div className="flex justify-between"><span className="text-gray-700 font-medium">ELO</span><span className="font-semibold text-gray-900">{stockfishConfig.elo}</span></div>
                </div>
              </div>

              {/* Playing Mode */}
              <div className="bg-green-50 p-3 rounded-lg">
                <h5 className="text-sm font-semibold text-green-800 mb-2">Playing Mode (AI Move Selection)</h5>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-700 font-medium">Mode</span><span className="font-semibold text-gray-900">{derived.mode}</span></div>
                  <div className="flex justify-between"><span className="text-gray-700 font-medium">UCI_LimitStrength</span><span className="font-semibold text-gray-900">{derived.uciLimitStrength ? 'ON' : 'OFF'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-700 font-medium">MultiPV</span><span className="font-semibold text-gray-900">{derived.multipv}</span></div>
                  <div className="flex justify-between"><span className="text-gray-700 font-medium">Depth</span><span className="font-semibold text-gray-900">{derived.depth ?? 'auto'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-700 font-medium">Time/Move</span><span className="font-semibold text-gray-900">{derived.timeLabel}</span></div>
                  {derived.uciElo && (
                    <div className="flex justify-between"><span className="text-gray-700 font-medium">UCI_Elo</span><span className="font-semibold text-gray-900">{derived.uciElo}</span></div>
                  )}
                </div>
              </div>

              {/* Move Selection Probabilities (if applicable) */}
              {derived.probabilities && (
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <h5 className="text-sm font-semibold text-yellow-800 mb-2">Move Selection Probabilities</h5>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-700 font-medium">Best Move</span><span className="font-semibold text-gray-900">{derived.probabilities.best}%</span></div>
                    <div className="flex justify-between"><span className="text-gray-700 font-medium">2nd Best</span><span className="font-semibold text-gray-900">{derived.probabilities.second}%</span></div>
                    <div className="flex justify-between"><span className="text-gray-700 font-medium">3rd Best</span><span className="font-semibold text-gray-900">{derived.probabilities.third}%</span></div>
                    <div className="flex justify-between"><span className="text-gray-700 font-medium">Random</span><span className="font-semibold text-gray-900">{derived.probabilities.random}%</span></div>
                  </div>
                </div>
              )}

            </div>
            <div className="mt-3 text-right">
              <button
                type="button"
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                onClick={() => setShowConfig(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



