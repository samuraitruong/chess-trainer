'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { StockfishConfig } from '@/types/chess';
import { Chess } from 'chess.js';

export function useStockfish() {
  const [isReady, setIsReady] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const stockfishRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialize real Stockfish engine
    const initStockfish = () => {
      try {
        // Create a real Stockfish worker
        stockfishRef.current = new Worker('/stockfish.js');
        
        stockfishRef.current.onmessage = (event: MessageEvent) => {
          const message = event.data;
          console.log('📨 Stockfish message:', message);
          
          if (message.includes('uciok')) {
            setIsReady(true);
            console.log('✅ Stockfish ready');
          } else if (message.includes('bestmove')) {
            setIsThinking(false);
          } else if (message.includes('option name')) {
            console.log('⚙️ Stockfish option:', message);
          }
        };

        stockfishRef.current.onerror = (error: ErrorEvent) => {
          console.error('Stockfish worker error:', error);
          console.error('Error details:', error.message, error.filename, error.lineno);
        };

        // Initialize UCI
        stockfishRef.current.postMessage('uci');
        stockfishRef.current.postMessage('isready');
      } catch (error) {
        console.error('Failed to initialize Stockfish:', error);
        throw error; // Don't fallback, let it fail for testing
      }
    };

    initStockfish();

    return () => {
      if (stockfishRef.current && stockfishRef.current.terminate) {
        stockfishRef.current.terminate();
      }
    };
  }, []);

  // Function for AI moves (with ELO configuration)
  const getAIMove = useCallback(async (
    fen: string, 
    config: StockfishConfig,
    onMoveFound: (move: string) => void
  ) => {
    console.log('Getting AI move for FEN:', fen, 'ELO:', config.elo);
    
    if (!stockfishRef.current || !isReady) {
      console.error('Stockfish not ready');
      throw new Error('Stockfish not ready');
    }

    setIsThinking(true);

    try {
      // Set up the position
      stockfishRef.current.postMessage(`position fen ${fen}`);
      
      // Configure Stockfish with UCI_LimitStrength for ELO-based play
      console.log(`🔧 Configuring Stockfish for ELO: ${config.elo}`);
      
      if (config.elo < 1320) {
        // For ELOs below 1320, use sophisticated mistake system with multiple PV
        console.log(`📉 Low ELO detected (${config.elo} < 1320), using realistic mistake system`);
        
        // Disable UCI_LimitStrength and enable multiple PV for realistic mistakes
        stockfishRef.current.postMessage(`setoption name UCI_LimitStrength value false`);
        stockfishRef.current.postMessage(`setoption name MultiPV value 12`);
        console.log(`📤 Sent to Stockfish: setoption name MultiPV value 12`);
        
        // Set up realistic weakening options
        stockfishRef.current.postMessage(`setoption name Threads value 1`);
        stockfishRef.current.postMessage(`setoption name Hash value 1`);
        console.log(`📤 Sent to Stockfish: setoption name Threads value 1`);
        console.log(`📤 Sent to Stockfish: setoption name Hash value 1`);
        
        console.log(`🎯 Stockfish config: ELO=${config.elo} -> MultiPV=12 (realistic mistakes)`);
        console.log(`📊 Using multiple PV to simulate human-like mistakes`);
        console.log(`🔧 UCI_LimitStrength disabled to use MultiPV system`);
      } else {
        // For ELOs 1320+, use UCI_LimitStrength with UCI_Elo
        console.log(`📈 High ELO detected (${config.elo} >= 1320), using UCI_Elo`);
        stockfishRef.current.postMessage(`setoption name UCI_LimitStrength value true`);
        
        // Only clamp if ELO is above 3190, don't raise low ELOs
        const clampedElo = Math.min(3190, config.elo);
        stockfishRef.current.postMessage(`setoption name UCI_Elo value ${clampedElo}`);
        
        console.log(`🎯 Stockfish config: ELO=${config.elo} -> UCI_Elo=${clampedElo} (UCI_LimitStrength enabled)`);
      }
      
      // Use realistic time limits with random variation for human-like behavior
      const baseTimeLimit = config.elo < 1320 ? 50 : Math.max(500, Math.min(5000, config.elo * 2));
      const randomVariation = config.elo < 1320 ? Math.random() * 100 + 50 : 0; // 50-150ms random variation
      const timeLimit = Math.floor(baseTimeLimit + randomVariation);
      const depthLimit = config.elo < 1320 ? 1 : 15;
      console.log(`⏱️ Time limit set to: ${timeLimit}ms (ELO: ${config.elo})`);
      console.log(`🔍 Depth limit set to: ${depthLimit} (ELO: ${config.elo})`);
      
      // Add realistic thinking delay to simulate human behavior
      const thinkingDelay = config.elo < 1320 ? Math.random() * 1000 + 500 : 200; // 500-1500ms for low ELOs
      console.log(`🧠 Thinking delay: ${thinkingDelay.toFixed(0)}ms (simulating human behavior)`);
      
      setTimeout(() => {
        console.log(`⏰ Starting search after thinking delay...`);
        if (config.elo < 1320) {
          // For low ELOs, use both depth and time limits
          stockfishRef.current?.postMessage(`go depth ${depthLimit} movetime ${timeLimit}`);
          console.log(`🔍 Search command: go depth ${depthLimit} movetime ${timeLimit}`);
        } else {
          // For high ELOs, use time limit only
          stockfishRef.current?.postMessage(`go movetime ${timeLimit}`);
          console.log(`🔍 Search command: go movetime ${timeLimit}`);
        }
      }, thinkingDelay);

      // Listen for the best move
      const handleMessage = (event: MessageEvent) => {
        const message = event.data;
        console.log('🤖 Stockfish response:', message);
        
        if (message.includes('bestmove')) {
          const move = message.split(' ')[1];
          if (move && move !== '(none)') {
            console.log(`🎯 Best move found: ${move} (ELO: ${config.elo})`);
            
            // Sophisticated mistake system using ELO-based move selection
            let finalMove = move;
            if (config.elo < 1320) {
              // Define move selection probabilities based on ELO
              const getMoveProbabilities = (elo: number) => {
                if (elo < 100) return { best: 0.1, second: 0.2, third: 0.3, random: 0.4 };
                if (elo < 200) return { best: 0.2, second: 0.3, third: 0.3, random: 0.2 };
                if (elo < 300) return { best: 0.3, second: 0.4, third: 0.2, random: 0.1 };
                if (elo < 400) return { best: 0.4, second: 0.4, third: 0.15, random: 0.05 };
                if (elo < 500) return { best: 0.5, second: 0.35, third: 0.1, random: 0.05 };
                if (elo < 600) return { best: 0.6, second: 0.3, third: 0.08, random: 0.02 };
                if (elo < 700) return { best: 0.7, second: 0.25, third: 0.04, random: 0.01 };
                if (elo < 800) return { best: 0.8, second: 0.18, third: 0.02, random: 0.0 };
                if (elo < 900) return { best: 0.85, second: 0.13, third: 0.02, random: 0.0 };
                if (elo < 1000) return { best: 0.9, second: 0.08, third: 0.02, random: 0.0 };
                if (elo < 1100) return { best: 0.95, second: 0.04, third: 0.01, random: 0.0 };
                return { best: 0.98, second: 0.02, third: 0.0, random: 0.0 };
              };
              
              const probabilities = getMoveProbabilities(config.elo);
              const random = Math.random();
              
              if (random < probabilities.best) {
                // Play best move
                finalMove = move;
                console.log(`🎯 Best move selected (ELO: ${config.elo})`);
              } else if (random < probabilities.best + probabilities.second) {
                // Play second best move (simulate with random legal move for now)
                const chess = new Chess(fen);
                const legalMoves = chess.moves();
                if (legalMoves.length > 1) {
                  finalMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
                  console.log(`🥈 Second best move selected: ${move} -> ${finalMove} (ELO: ${config.elo})`);
                }
              } else if (random < probabilities.best + probabilities.second + probabilities.third) {
                // Play third best move
                const chess = new Chess(fen);
                const legalMoves = chess.moves();
                if (legalMoves.length > 1) {
                  finalMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
                  console.log(`🥉 Third best move selected: ${move} -> ${finalMove} (ELO: ${config.elo})`);
                }
              } else {
                // Play random move
                const chess = new Chess(fen);
                const legalMoves = chess.moves();
                if (legalMoves.length > 1) {
                  finalMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
                  console.log(`🎲 Random move selected: ${move} -> ${finalMove} (ELO: ${config.elo})`);
                }
              }
            }
            
            onMoveFound(finalMove);
          }
          setIsThinking(false);
          // Restore the original message handler
          if (stockfishRef.current) {
            stockfishRef.current.onmessage = (event: MessageEvent) => {
              const message = event.data;
              if (message.includes('uciok')) {
                setIsReady(true);
              }
            };
          }
        }
      };

      if (stockfishRef.current) {
        stockfishRef.current.onmessage = handleMessage;
      }
    } catch (error) {
      console.error('Stockfish error:', error);
      setIsThinking(false);
      throw error;
    }
  }, [isReady]);

  // Function for analysis (max strength)
  const getBestMove = useCallback(async (
    fen: string, 
    depth: number = 5
  ): Promise<{ move: string; evaluation: number }> => {
    console.log('Getting best move for FEN:', fen, 'Depth:', depth);
    
    if (!stockfishRef.current || !isReady) {
      console.error('Stockfish not ready');
      throw new Error('Stockfish not ready');
    }

    setIsThinking(true);

    return new Promise((resolve, reject) => {
      try {
        // Set up the position
        stockfishRef.current!.postMessage(`position fen ${fen}`);
        
        // Configure for analysis (max strength)
        stockfishRef.current!.postMessage(`setoption name UCI_LimitStrength value false`);
        stockfishRef.current!.postMessage(`setoption name MultiPV value 1`);
        
        // Listen for the best move and evaluation
        const handleMessage = (event: MessageEvent) => {
          const message = event.data;
          console.log('🤖 Stockfish analysis response:', message);
          
          if (message.includes('bestmove')) {
            const parts = message.split(' ');
            const move = parts[1];
            const evaluation = 0; // We'll extract this from info messages
            
            if (move && move !== '(none)') {
              console.log(`🎯 Best move found: ${move}`);
              resolve({ move, evaluation });
            } else {
              reject(new Error('No valid move found'));
            }
            setIsThinking(false);
            
            // Restore the original message handler
            if (stockfishRef.current) {
              stockfishRef.current.onmessage = (event: MessageEvent) => {
                const message = event.data;
                if (message.includes('uciok')) {
                  setIsReady(true);
                }
              };
            }
          } else if (message.includes('info') && message.includes('score cp')) {
            // Extract evaluation from info message
            const cpMatch = message.match(/score cp (-?\d+)/);
            if (cpMatch) {
              const evaluation = parseInt(cpMatch[1]);
              console.log(`📊 Position evaluation: ${evaluation}`);
            }
          }
        };

        if (stockfishRef.current) {
          stockfishRef.current.onmessage = handleMessage;
        }
        
        // Start analysis
        stockfishRef.current!.postMessage(`go depth ${depth}`);
        
      } catch (error) {
        console.error('Stockfish analysis error:', error);
        setIsThinking(false);
        reject(error);
      }
    });
  }, [isReady]);

  const analyzePosition = useCallback(async (
    fen: string,
    depth: number = 15,
    onUpdate?: (partial: { evaluation: number; pvLines: Array<{ evaluation: number; moves: string[] }>; mateIn: number | null; mateFor: 'white' | 'black' | null; }) => void
  ): Promise<{ evaluation: number; bestMove: string; pv: string[]; pvLines: Array<{ evaluation: number; moves: string[] }>; mateIn: number | null; mateFor: 'white' | 'black' | null; }> => {
    return new Promise((resolve) => {
      if (!stockfishRef.current || !isReady) {
        resolve({ evaluation: 0, bestMove: '', pv: [], pvLines: [], mateIn: null, mateFor: null });
        return;
      }

      // Always report evaluation from White's perspective
      const sideToMove = fen.split(' ')[1] === 'b' ? 'b' : 'w';
      let lastEvaluation = 0; // white-centric centipawns
      let allMoves: string[] = [];
      const pvLines: Array<{evaluation: number, moves: string[]}> = []; // Store PV lines with evaluations
      let bestMoves: string[] = [];
      let lastMateInWhitePerspective: number | null = null; // positive => white mates in N, negative => black mates in N
      let lastPartialPushedAt = 0;
      
      // Ensure Stockfish is ready before setting MultiPV
      if (!isReady) {
        console.error('📊 Stockfish not ready for analysis');
        resolve({ evaluation: 0, bestMove: '', pv: [], pvLines: [], mateIn: null, mateFor: null });
        return;
      }
      
      // Set MultiPV to 4 to get 4 best moves
      console.log('📊 Setting MultiPV to 4...');
      stockfishRef.current.postMessage('setoption name MultiPV value 4');
      stockfishRef.current.postMessage(`position fen ${fen}`);
      stockfishRef.current.postMessage(`go depth ${depth}`);

      const handleMessage = (event: MessageEvent) => {
        const message = event.data;
        
        // Log all Stockfish messages to see what we're getting
        console.log('📊 Stockfish message:', message);
        
        // Check if MultiPV option is being acknowledged
        if (message.includes('MultiPV')) {
          console.log('📊 MultiPV option response:', message);
        }
        
        // Check for errors
        if (message.includes('error') || message.includes('Error')) {
          console.error('📊 Stockfish error:', message);
        }
        
        // Prepare for PV parsing
        let multipvNumber = 1;
        const multipvMatchInline = message.match(/\bmultipv (\d+)/);
        if (multipvMatchInline) {
          multipvNumber = parseInt(multipvMatchInline[1]);
        }
        
        // Capture principal variation from info messages
        if (message.includes('info') && message.includes(' pv ')) {
          // Extract evaluation from the same line (prefer mate, else cp)
          let evalCp = 0;
          const mateMatch = message.match(/\bscore mate (-?\d+)/);
          if (mateMatch) {
            const mateIn = parseInt(mateMatch[1]);
            // Represent mate scores as large centipawn values with sign
            evalCp = mateIn > 0 ? 32000 : -32000;
            // Track mate-in from White perspective (positive -> white mates)
            const whiteMateIn = sideToMove === 'w' ? mateIn : -mateIn;
            // Only track for the principal line (multipv 1)
            if (multipvNumber === 1) {
              lastMateInWhitePerspective = whiteMateIn;
            }
          } else {
            const cpMatchInline = message.match(/\bscore cp (-?\d+)/);
            if (cpMatchInline) evalCp = parseInt(cpMatchInline[1]);
          }

          // Flip sign to White perspective if it's Black to move
          const whiteEvalCp = sideToMove === 'w' ? evalCp : -evalCp;

          // Extract PV tokens after 'pv'
          const pvMatch = message.match(/\bpv\s+([a-z0-9\s]+)/i);
          if (pvMatch) {
            const uciMoves: string[] = pvMatch[1]
              .trim()
              .split(/\s+/)
              .filter((token: string) => /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(token));
            if (uciMoves.length > 0) {
              try {
                const chess = new Chess(fen);
                const sanMoves: string[] = [];
                for (const uciMove of uciMoves.slice(0, 6)) {
                  try {
                    const promotionChar = uciMove.length === 5 && /[qrbn]/.test(uciMove[4]) ? uciMove[4] : undefined;
                    const move = chess.move({
                      from: uciMove.substring(0, 2),
                      to: uciMove.substring(2, 4),
                      promotion: promotionChar as 'q' | 'r' | 'b' | 'n' | undefined,
                    });
                    if (move) sanMoves.push(move.san);
                  } catch (e) {
                    // skip invalid
                  }
                }
                // Ensure array index for multipv
                const idx = Math.max(0, multipvNumber - 1);
                pvLines[idx] = { evaluation: whiteEvalCp, moves: sanMoves };
                if (idx === 0 && sanMoves.length > 0) {
                  bestMoves = sanMoves;
                  allMoves = sanMoves;
                }
                // Track last white-centric evaluation
                if (idx === 0) {
                  lastEvaluation = whiteEvalCp;
                }
              } catch (e) {
                // ignore conversion errors
              }
            }
          }
          // Emit partial update if available (throttle a bit)
          if (onUpdate) {
            const now = Date.now();
            if (now - lastPartialPushedAt > 100) {
              const filled = pvLines.filter(Boolean);
              const bestLine = filled[0] ?? filled.slice().sort((a,b)=>b.evaluation-a.evaluation)[0];
              const currentEval = bestLine ? bestLine.evaluation : lastEvaluation;
              const currentMateIn = lastMateInWhitePerspective;
              const currentMateFor = currentMateIn == null ? null : (currentMateIn > 0 ? 'white' : 'black');
              onUpdate({
                evaluation: currentEval,
                pvLines: filled.slice(0, 4).map(pl => ({ evaluation: pl.evaluation, moves: pl.moves.slice(0, 6) })),
                mateIn: currentMateIn,
                mateFor: currentMateFor,
              });
              lastPartialPushedAt = now;
            }
          }
        }
        
        if (message.includes('bestmove')) {
          const parts = message.split(' ');
          const bestMove = parts[1];
          
          // Prefer multipv 1 as best line. Fallback to max eval if missing.
          const filledPvLines = pvLines.filter(Boolean);
          const bestLine = filledPvLines[0] ?? filledPvLines.slice().sort((a,b)=>b.evaluation-a.evaluation)[0];
          const finalEvaluation = bestLine ? bestLine.evaluation : lastEvaluation;
          const finalMateIn = lastMateInWhitePerspective;
          const mateFor = finalMateIn == null ? null : (finalMateIn > 0 ? 'white' : 'black');
          
          // Keep original order by multipv (1..n). If gaps, compress.
          const sortedPvLines = filledPvLines;
          console.log('📊 Sorted PV lines by evaluation:', sortedPvLines);
          
          // Return the complete PV lines with evaluations
          const completePvLines = sortedPvLines.slice(0, 4).map(pvLine => ({
            evaluation: pvLine.evaluation,
            moves: pvLine.moves.slice(0, 6) // Take first 6 moves from each line
          }));
          
          console.log('📊 Complete PV lines for display:', completePvLines);
          
          // For backward compatibility, also provide the first moves
          const allPvMoves: string[] = [];
          for (const pvLine of completePvLines) {
            if (pvLine.moves.length > 0) {
              allPvMoves.push(pvLine.moves[0]); // Just the first move for compatibility
            }
          }
          
          // If no moves were captured, try to get them from bestmove line
          if (allPvMoves.length === 0 && parts.length > 3) {
            const pvFromBestmove = parts.slice(3);
            console.log('📊 PV from bestmove line:', pvFromBestmove);
            allPvMoves.push(...pvFromBestmove.slice(0, 4));
          }
          
          resolve({ 
            evaluation: finalEvaluation, 
            bestMove, 
            pv: allPvMoves,
            pvLines: completePvLines,
            mateIn: finalMateIn,
            mateFor,
          } as unknown as { evaluation: number; bestMove: string; pv: string[]; pvLines: Array<{ evaluation: number; moves: string[] }>; mateIn: number | null; mateFor: 'white' | 'black' | null; });
          
          // Reset MultiPV to 1
          console.log('📊 Resetting MultiPV to 1...');
          stockfishRef.current!.postMessage('setoption name MultiPV value 1');
          
          // Restore original handler
          if (stockfishRef.current) {
            stockfishRef.current.onmessage = (event: MessageEvent) => {
              const message = event.data;
              if (message.includes('uciok')) {
                setIsReady(true);
              }
            };
          }
        }
      };

      if (stockfishRef.current) {
        stockfishRef.current.onmessage = handleMessage;
      }
    });
  }, [isReady]);

  const stopThinking = useCallback(() => {
    if (stockfishRef.current) {
      stockfishRef.current.postMessage('stop');
      setIsThinking(false);
    }
  }, []);

  return {
    isReady,
    isThinking,
    getAIMove,
    getBestMove,
    analyzePosition,
    stopThinking,
  };
}

