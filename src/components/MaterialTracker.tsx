'use client';

import React, { useMemo, useState } from 'react';
import { Chess, Move } from 'chess.js';
import { useDatabase } from '@/contexts/DatabaseContext';
import { getLevelProfile, LEVELS } from '@/utils/levelConfig';
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

function CapturedIcons({ counts, align = 'left' }: { counts: Partial<Record<PieceType, number>>; align?: 'left' | 'right' }) {
  const order: PieceType[] = ['q', 'r', 'b', 'n', 'p'];

  return (
    <div className={`flex flex-row flex-wrap gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
      {order.map((pt) => {
        const count = counts[pt];
        if (!count || count <= 0 || pt === 'k') return null;
        return (
          <span key={pt} className="relative inline-flex items-center justify-center text-gray-800">
            <span className="text-sm">{PieceIcon[pt as Exclude<PieceType, 'k'>]}</span>
            {count > 1 && (
              <span className="ml-0.5 text-[10px] text-gray-700">x{count}</span>
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

  const { whiteCaptured, blackCaptured, whiteMaterial, blackMaterial } = useMemo(() => {
    const chess = new Chess();
    const whiteCapturedCounts: Partial<Record<PieceType, number>> = {};
    const blackCapturedCounts: Partial<Record<PieceType, number>> = {};
    let whiteMat = 0;
    let blackMat = 0;

    for (const san of gameState.moves) {
      try {
        const mv = chess.move(san) as Move | null;
        if (mv && (mv as any).captured) {
          const capturedType = ((mv as any).captured || '').toLowerCase() as PieceType;
          const moverColor = (mv as any).color as 'w' | 'b';
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
  const levelFromElo = (elo: number) => {
    const minElo = 50, maxElo = 2000;
    const fraction = Math.max(0, Math.min(1, (elo - minElo) / (maxElo - minElo)));
    return 1 + Math.floor(fraction * 19);
  };
  const aiLabel = React.useMemo(() => {
    if (!isWhite) {
      const lvl = levelFromElo(stockfishConfig.elo);
      const profile = getLevelProfile(lvl);
      return profile.animalName;
    }
    return 'Player';
  }, [isWhite, stockfishConfig.elo]);
  const showPlus = (isWhite && materialDiff > 0) || (!isWhite && materialDiff < 0);
  const plusVal = isWhite ? materialDiff : Math.abs(materialDiff);
  const counts = isWhite ? whiteCaptured : blackCaptured;
  const align = isWhite ? 'left' : 'right';

  const derived = useMemo(() => {
    const elo = stockfishConfig.elo;
    if (elo < 1320) {
      return {
        mode: 'Low ELO (realistic mistakes)',
        uciLimitStrength: false,
        multipv: 12,
        threads: 1,
        hash: 1,
        depth: 1,
        timeLabel: '≈50–150 ms',
      } as const;
    }
    const time = Math.max(500, Math.min(5000, elo * 2));
    return {
      mode: 'UCI_LimitStrength',
      uciLimitStrength: true,
      multipv: 1,
      threads: 'default',
      hash: 'default',
      depth: undefined,
      timeLabel: `${time} ms`,
    } as const;
  }, [stockfishConfig.elo]);

  return (
    <div className={`w-full px-3 py-2 ${noBorder ? '' : 'bg-white/70 border rounded-md'}`}>
      <div className={`flex ${align === 'right' ? 'flex-row-reverse' : 'flex-row'} items-center justify-between`}>
        <button
          type="button"
          className="text-sm font-semibold text-gray-800 hover:text-blue-700"
          onClick={() => {
            if (side === 'black') setShowConfig(true);
          }}
        >
          {aiLabel}
        </button>
        {showPlus && <span className="text-xs font-bold text-green-700">+{plusVal}</span>}
      </div>
      <div className={`mt-1 ${align === 'right' ? 'text-right' : ''}`}>
        <CapturedIcons counts={counts} align={align as 'left' | 'right'} />
      </div>
      {side === 'black' && showConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowConfig(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">AI Setup</h3>
              <button
                type="button"
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
                onClick={() => setShowConfig(false)}
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 text-sm text-gray-800">
              <div className="flex items-center justify-between"><span className="text-gray-600">ELO</span><span className="font-medium">{stockfishConfig.elo}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-600">Engine</span><span className="font-medium">Stockfish (WASM)</span></div>
              <div className="pt-2 border-t border-gray-200 text-xs uppercase tracking-wide text-gray-500">Playing mode (AI move selection)</div>
              <div className="flex items-center justify-between"><span className="text-gray-600">Mode</span><span className="font-medium">{derived.mode}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-600">UCI_LimitStrength</span><span className="font-medium">{derived.uciLimitStrength ? 'ON' : 'OFF'}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-600">MultiPV</span><span className="font-medium">{derived.multipv}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-600">Depth</span><span className="font-medium">{derived.depth ?? 'auto'}</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-600">Time/Move</span><span className="font-medium">{derived.timeLabel}</span></div>
              <div className="pt-2 border-t border-gray-200 text-xs uppercase tracking-wide text-gray-500">Analysis mode (engine evaluation)</div>
              <div className="flex items-center justify-between"><span className="text-gray-600">MultiPV</span><span className="font-medium">4</span></div>
              <div className="flex items-center justify-between"><span className="text-gray-600">Depth</span><span className="font-medium">18</span></div>
              <div className="pt-3 border-t border-gray-200 text-xs uppercase tracking-wide text-gray-500">Level Progress</div>
              {(() => {
                const lvl = levelFromElo(stockfishConfig.elo);
                return (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {LEVELS.map(lp => (
                      <div
                        key={lp.level}
                        className={`p-2 rounded border text-xs font-semibold ${lp.level <= lvl ? 'opacity-100 border-green-200 bg-green-50 text-green-800' : 'opacity-50 border-gray-200 bg-gray-50 text-gray-600'}`}
                      >
                        <div className="flex items-center justify-between">
                          <span>Lv {lp.level}</span>
                          <span>{lp.animalName}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
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



