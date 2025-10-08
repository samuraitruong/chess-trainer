'use client';

import { Chess } from 'chess.js';

// Lichess Win% and Accuracy% formulas
// Ref: https://lichess.org/page/accuracy
export function winPercentFromCentipawns(centipawns: number): number {
  const k = -0.00368208;
  const expTerm = Math.exp(k * centipawns);
  const win = 50 + 50 * (2 / (1 + expTerm) - 1);
  const result = Math.max(0, Math.min(100, win));
  
  console.log('🔍 winPercentFromCentipawns:', {
    centipawns,
    expTerm: expTerm.toFixed(6),
    win: win.toFixed(2),
    result: result.toFixed(2)
  });
  
  return result;
}

export function moveAccuracyFromWinDelta(winBefore: number, winAfter: number): number {
  const delta = winBefore - winAfter;
  const expTerm = Math.exp(-0.04354 * delta);
  const accuracy = 103.1668 * expTerm - 3.1669;
  const result = Math.max(0, Math.min(100, accuracy));
  
  console.log('🔍 moveAccuracyFromWinDelta:', {
    winBefore: winBefore.toFixed(2),
    winAfter: winAfter.toFixed(2),
    delta: delta.toFixed(2),
    expTerm: expTerm.toFixed(6),
    accuracy: accuracy.toFixed(2),
    result: result.toFixed(2)
  });
  
  return result;
}

export type AnalyzeFn = (
  fen: string,
  depth: number
) => Promise<{ evaluation: number } | { evaluation: number; bestMove?: string }>;

// Compute player's accuracy across their moves using depth 20 analysis
export async function computePlayerAccuracy(
  movesSan: string[],
  playerColor: 'white' | 'black',
  analyzePosition: (fen: string, depth?: number) => Promise<{ evaluation: number }>
): Promise<number> {
  const chess = new Chess();
  const playerToMove = playerColor === 'white' ? 'w' : 'b';
  const accuracies: number[] = [];

  // Iterate through plies; evaluate only player's moves
  for (let i = 0; i < movesSan.length; i++) {
    const san = movesSan[i];

    // Before making the move, check whose turn it is
    const sideToMove = chess.turn();
    const isPlayersMove = sideToMove === playerToMove;

    // Capture FEN before player's move
    const fenBefore = chess.fen();

    // Play the move
    try {
      chess.move(san);
    } catch {
      // Skip invalid SANs to avoid breaking analysis
      continue;
    }

    if (!isPlayersMove) {
      // We analyze only player's own moves
      continue;
    }

    const fenAfter = chess.fen();

    // Analyze both positions at depth 20 (cap mate to large cp value)
    const depth = 20;
    const [{ evaluation: evalBeforeWhite }, { evaluation: evalAfterWhite }] = await Promise.all([
      analyzePosition(fenBefore, depth),
      analyzePosition(fenAfter, depth),
    ]);

    // Lichess uses white-centric cp; convert to player's win%
    const cpCap = 1000; // cap extreme values for stability
    const cpBefore = Math.max(-cpCap, Math.min(cpCap, evalBeforeWhite));
    const cpAfter = Math.max(-cpCap, Math.min(cpCap, evalAfterWhite));

    const winBeforeWhite = winPercentFromCentipawns(cpBefore);
    const winAfterWhite = winPercentFromCentipawns(cpAfter);

    const winBeforePlayer = playerColor === 'white' ? winBeforeWhite : 100 - winBeforeWhite;
    const winAfterPlayer = playerColor === 'white' ? winAfterWhite : 100 - winAfterWhite;

    const moveAcc = moveAccuracyFromWinDelta(winBeforePlayer, winAfterPlayer);
    accuracies.push(moveAcc);
  }

  if (accuracies.length === 0) return 0;
  const avg = accuracies.reduce((s, a) => s + a, 0) / accuracies.length;
  return Math.round(avg * 10) / 10; // one decimal
}


