'use client';

// Removed unused Chess import

// Simple Stockfish analysis without threading issues
export class StockfishAnalysis {
  private worker: Worker | null = null;
  private isReady = false;

  async init(): Promise<void> {
    if (this.worker) return;
    
    try {
      console.log('🔧 Initializing Stockfish analysis engine...');
      this.worker = new Worker('/stockfish.js');
      
      await new Promise<void>((resolve, reject) => {
        if (!this.worker) {
          reject(new Error('Worker creation failed'));
          return;
        }

        const timeout = setTimeout(() => {
          reject(new Error('Stockfish initialization timeout'));
        }, 10000); // 10 second timeout

        this.worker.onmessage = (event: MessageEvent) => {
          const message = event.data as string;
          console.log('🔧 Stockfish message:', message);
          
          if (message.includes('uciok')) {
            clearTimeout(timeout);
            this.isReady = true;
            console.log('✅ Stockfish analysis engine ready');
            resolve();
          } else if (message.includes('error') || message.includes('Error')) {
            clearTimeout(timeout);
            console.error('❌ Stockfish error:', message);
            reject(new Error(message));
          }
        };

        this.worker.onerror = (error) => {
          clearTimeout(timeout);
          console.error('❌ Stockfish worker error:', error);
          reject(error);
        };

        // Initialize UCI
        this.worker.postMessage('uci');
        this.worker.postMessage('isready');
      });
      
    } catch (error) {
      console.error('❌ Failed to initialize Stockfish analysis:', error);
      throw error;
    }
  }

  async analyzePosition(fen: string, depth: number = 15): Promise<number> {
    if (!this.worker || !this.isReady) {
      console.warn('⚠️ Stockfish not ready, returning 0');
      return 0;
    }

    return new Promise<number>((resolve, reject) => {
      let lastCp = 0;
      let messageCount = 0;
      const startTime = Date.now();
      
      const timeout = setTimeout(() => {
        console.warn('⚠️ Stockfish analysis timeout, using last evaluation');
        resolve(lastCp);
      }, 30000); // 30 second timeout
      
      const handleMessage = (event: MessageEvent) => {
        const message = event.data as string;
        messageCount++;
        
        if (message.includes('info')) {
          // Extract evaluation from info message
          const mateMatch = message.match(/score mate (-?\d+)/);
          if (mateMatch) {
            const mateIn = parseInt(mateMatch[1]);
            lastCp = mateIn > 0 ? 32000 : -32000; // Large CP for mate
            console.log(`🔧 Mate found: ${mateIn}, CP: ${lastCp}`);
          } else {
            const cpMatch = message.match(/score cp (-?\d+)/);
            if (cpMatch) {
              lastCp = parseInt(cpMatch[1]);
              console.log(`🔧 CP found: ${lastCp}`);
            }
          }
        } else if (message.includes('bestmove')) {
          const totalTime = Date.now() - startTime;
          console.log(`🔧 Analysis complete in ${totalTime}ms after ${messageCount} messages`);
          console.log(`🔧 Final CP: ${lastCp}`);
          
          clearTimeout(timeout);
          this.worker!.removeEventListener('message', handleMessage as EventListener);
          resolve(lastCp);
        }
      };
      
      this.worker!.addEventListener('message', handleMessage as EventListener);
      
      // Configure for analysis
      this.worker!.postMessage('setoption name UCI_LimitStrength value false');
      this.worker!.postMessage('setoption name MultiPV value 1');
      this.worker!.postMessage('setoption name Threads value 1'); // Single thread to avoid issues
      this.worker!.postMessage('setoption name Hash value 16'); // Small hash to avoid memory issues
      this.worker!.postMessage(`position fen ${fen}`);
      this.worker!.postMessage(`go depth ${depth}`);
      
      console.log(`🔧 Analyzing position at depth ${depth}: ${fen}`);
    });
  }

  terminate(): void {
    if (this.worker) {
      console.log('🔧 Terminating Stockfish analysis engine');
      this.worker.terminate();
      this.worker = null;
      this.isReady = false;
    }
  }
}
