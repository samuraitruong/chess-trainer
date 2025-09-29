# 🧩 Chess Training App (Next.js + Stockfish)

A chess training app designed for kids to learn and improve by playing against **Stockfish** at adjustable strength.  
The engine starts weak and gradually increases in Elo as the child wins games.  
After each game, the app provides a **review** and tracks progress.

---

## 🎯 Goals
- Progressive training against AI (Stockfish).
- Game review with analysis of mistakes.
- Simple and child-friendly UI.
- Track progress and adjust AI difficulty automatically.

---

## 🔧 Tech Stack
- **Frontend**: [Next.js](https://nextjs.org/), React, TypeScript
- **Styling**: TailwindCSS
- **Chess Board UI**: [`react-chessboard`](https://www.npmjs.com/package/react-chessboard) or [`chessground`](https://github.com/lichess-org/chessground)
- **Game Logic**: [`chess.js`](https://www.npmjs.com/package/chess.js) for validation & PGN
- **AI Engine**: [Stockfish WASM](https://www.npmjs.com/package/stockfish) (runs in browser via Web Worker)
- **Database**: SQLite (local) or MongoDB (cloud)
- **State Management**: React Context or Zustand

---

## 🚀 Features

### ✅ Core Features (MVP)
1. **Play vs Stockfish**
   - Adjustable AI Elo (default 800).
   - Moves validated with `chess.js`.
   - AI responds using Stockfish with `UCI_LimitStrength`.

2. **Review Game**
   - Replay moves step-by-step.
   - Post-game analysis at full Stockfish strength.
   - Highlight blunders & best moves.

3. **Progression System**
   - Increase AI Elo after X wins (configurable).
   - Optionally lower Elo if repeated losses.
   - Store results and PGN history.

4. **Dashboard**
   - Current AI Elo.
   - Win/Loss history.
   - Accuracy stats.
   - Performance trend chart.

---

### 🌟 Extended Features (Phase 2)
- Tactical puzzles generated from mistakes.
- Daily challenges.
- Parent/coach view with stats.
- Login for multi-device progress sync.

---

## 📂 Suggested Project Structure

