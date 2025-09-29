# 🧩 Chess Trainer

A progressive chess training app designed for kids to learn and improve by playing against **Stockfish** AI at adjustable strength. The engine starts weak and gradually increases in Elo as the child wins games.

## 🎯 Features

### ✅ Core Features
- **Play vs Stockfish**: Adjustable AI Elo (default 800)
- **Move Validation**: All moves validated with chess.js
- **Progressive Difficulty**: AI strength increases with wins
- **Game Review**: Post-game analysis with move evaluation
- **Dashboard**: Track progress, win rate, and accuracy
- **Child-Friendly UI**: Simple and intuitive interface

### 🚀 Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Development Server**
   ```bash
   npm run dev
   ```

3. **Open Browser**
   Navigate to `http://localhost:3000`

## 🎮 How to Play

1. **Start a Game**: Click "New Game" to begin
2. **Make Moves**: Drag and drop pieces to make moves
3. **AI Response**: The AI will automatically respond
4. **Review Game**: Click "Review Game" after finishing
5. **Track Progress**: Check your dashboard for stats

## 🏗️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: TailwindCSS
- **Chess Logic**: chess.js
- **Chess Board**: react-chessboard
- **AI Engine**: Stockfish (Web Worker)
- **State Management**: React Context

## 📊 Progression System

- **Wins**: AI Elo increases by 50 points
- **Losses**: AI Elo decreases by 50 points (if win rate < 30%)
- **Elo Range**: 400 (Beginner) to 2000 (Master)
- **Automatic Adjustment**: Based on performance over time

## 🎯 Game Review Features

- **Move Analysis**: Each move evaluated for accuracy
- **Blunder Detection**: Identifies major mistakes
- **Best Move Suggestions**: Shows optimal moves
- **Step-by-Step Review**: Navigate through the game
- **Performance Metrics**: Track improvement over time

## 🎨 UI Features

- **Responsive Design**: Works on desktop and mobile
- **Child-Friendly**: Large buttons and clear visuals
- **Progress Tracking**: Visual indicators for improvement
- **Game Controls**: Easy to use interface
- **Statistics Dashboard**: Comprehensive progress view

## 🔧 Development

### Project Structure
```
src/
├── app/                 # Next.js app directory
├── components/          # React components
│   ├── ChessBoard.tsx
│   ├── GameControls.tsx
│   ├── Dashboard.tsx
│   └── GameReview.tsx
├── contexts/           # React contexts
│   └── GameContext.tsx
├── hooks/             # Custom hooks
│   └── useStockfish.ts
├── types/             # TypeScript types
│   └── chess.ts
└── utils/             # Utility functions
```

### Key Components

- **GameContext**: Manages game state and player stats
- **ChessBoard**: Interactive chess board with move validation
- **useStockfish**: Hook for AI engine integration
- **Dashboard**: Progress tracking and statistics
- **GameReview**: Post-game analysis and move evaluation

## 🚀 Future Enhancements

- **Tactical Puzzles**: Generated from mistakes
- **Daily Challenges**: Regular training exercises
- **Parent Dashboard**: Progress monitoring for parents
- **Multi-Device Sync**: Cloud-based progress tracking
- **Advanced Analytics**: Detailed performance insights

## 📝 License

This project is open source and available under the MIT License.