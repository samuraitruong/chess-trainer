export type PlayMode =
  | { kind: 'mistake'; multipv: number; bestProb: number; secondProb: number; thirdProb: number; randomProb: number; depthCap: number; timeMinMs: number; timeMaxMs: number }
  | { kind: 'elo'; uciElo: number; timeMs: number };

export interface LevelProfile {
  level: number; // 1..20
  description: string;
  animalName: string;
  play: PlayMode;
}

// Levels 1-12: realistic mistakes; 13-20: UCI_Elo limited
export const LEVELS: LevelProfile[] = [
    // --- More challenging beginner bots ---
    { level: 1, description: 'Beginner I (~200 Elo)', animalName: 'Chick',
      play: { kind: 'mistake', multipv: 12, bestProb: 0.30, secondProb: 0.25, thirdProb: 0.25, randomProb: 0.20, depthCap: 2, timeMinMs: 200, timeMaxMs: 400 } },
  
    { level: 2, description: 'Beginner II (~300 Elo)', animalName: 'Mouse',
      play: { kind: 'mistake', multipv: 12, bestProb: 0.40, secondProb: 0.30, thirdProb: 0.20, randomProb: 0.10, depthCap: 2, timeMinMs: 300, timeMaxMs: 500 } },
  
    { level: 3, description: 'Beginner III (~400 Elo)', animalName: 'Rabbit',
      play: { kind: 'mistake', multipv: 12, bestProb: 0.50, secondProb: 0.30, thirdProb: 0.15, randomProb: 0.05, depthCap: 3, timeMinMs: 400, timeMaxMs: 600 } },
  
    { level: 4, description: 'Beginner IV (~500 Elo)', animalName: 'Fox',
      play: { kind: 'mistake', multipv: 12, bestProb: 0.60, secondProb: 0.25, thirdProb: 0.12, randomProb: 0.03, depthCap: 3, timeMinMs: 500, timeMaxMs: 700 } },
  
    { level: 5, description: 'Novice I (~600 Elo)', animalName: 'Dog',
      play: { kind: 'mistake', multipv: 10, bestProb: 0.70, secondProb: 0.20, thirdProb: 0.08, randomProb: 0.02, depthCap: 4, timeMinMs: 600, timeMaxMs: 800 } },
  
    { level: 6, description: 'Novice II (~700 Elo)', animalName: 'Goat',
      play: { kind: 'mistake', multipv: 10, bestProb: 0.75, secondProb: 0.18, thirdProb: 0.06, randomProb: 0.01, depthCap: 4, timeMinMs: 700, timeMaxMs: 900 } },
  
    { level: 7, description: 'Intermediate I (~800 Elo)', animalName: 'Sheep',
      play: { kind: 'mistake', multipv: 8, bestProb: 0.80, secondProb: 0.15, thirdProb: 0.04, randomProb: 0.01, depthCap: 5, timeMinMs: 800, timeMaxMs: 1000 } },
  
    { level: 8, description: 'Intermediate II (~900 Elo)', animalName: 'Pig',
      play: { kind: 'mistake', multipv: 8, bestProb: 0.85, secondProb: 0.12, thirdProb: 0.03, randomProb: 0, depthCap: 5, timeMinMs: 900, timeMaxMs: 1100 } },
  
    { level: 9, description: 'Intermediate III (~1000 Elo)', animalName: 'Deer',
      play: { kind: 'mistake', multipv: 8, bestProb: 0.75, secondProb: 0.22, thirdProb: 0.03, randomProb: 0.00, depthCap: 2, timeMinMs: 400, timeMaxMs: 600 } },
  
    { level: 10, description: 'Skilled I (~1100 Elo)', animalName: 'Boar',
      play: { kind: 'mistake', multipv: 6, bestProb: 0.80, secondProb: 0.18, thirdProb: 0.02, randomProb: 0.00, depthCap: 3, timeMinMs: 450, timeMaxMs: 650 } },
  
    { level: 11, description: 'Skilled II (~1200 Elo)', animalName: 'Leopard',
      play: { kind: 'mistake', multipv: 6, bestProb: 0.85, secondProb: 0.13, thirdProb: 0.02, randomProb: 0.00, depthCap: 3, timeMinMs: 500, timeMaxMs: 700 } },
  
    { level: 12, description: 'Advanced (~1300 Elo)', animalName: 'Panther',
      play: { kind: 'mistake', multipv: 6, bestProb: 0.90, secondProb: 0.09, thirdProb: 0.01, randomProb: 0.00, depthCap: 3, timeMinMs: 550, timeMaxMs: 800 } },
  
    // --- Switch to Stockfish Elo mode (smooth transition) ---
    { level: 13, description: 'Club Beginner (~1400 Elo)', animalName: 'Tiger',
      play: { kind: 'elo', uciElo: 1400, timeMs: 2000 } },
  
    { level: 14, description: 'Club Novice (~1500 Elo)', animalName: 'Lion',
      play: { kind: 'elo', uciElo: 1500, timeMs: 2500 } },
  
    { level: 15, description: 'Club Intermediate (~1600 Elo)', animalName: 'Horse',
      play: { kind: 'elo', uciElo: 1600, timeMs: 3000 } },
  
    { level: 16, description: 'Strong Club (~1700 Elo)', animalName: 'Buffalo',
      play: { kind: 'elo', uciElo: 1700, timeMs: 3500 } },
  
    { level: 17, description: 'Expert (~1800 Elo)', animalName: 'Rhino',
      play: { kind: 'elo', uciElo: 1800, timeMs: 4000 } },
  
    { level: 18, description: 'Candidate Master (~1900 Elo)', animalName: 'Hippo',
      play: { kind: 'elo', uciElo: 1900, timeMs: 4500 } },
  
    { level: 19, description: 'Master (~2000 Elo)', animalName: 'Giraffe',
      play: { kind: 'elo', uciElo: 2000, timeMs: 5000 } },
  
    { level: 20, description: 'Strong Master (~2100+ Elo)', animalName: 'Elephant',
      play: { kind: 'elo', uciElo: 2100, timeMs: 6000 } },
  ];
  

export function getLevelProfile(level: number): LevelProfile {
  const clamped = Math.max(1, Math.min(20, Math.floor(level)));
  return LEVELS[clamped - 1];
}


