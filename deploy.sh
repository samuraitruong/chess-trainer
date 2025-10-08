#!/bin/bash

# Chess Trainer Deployment Script
# This script helps deploy the app with proper CORS headers for Stockfish WASM

echo "🚀 Deploying Chess Trainer with Stockfish WASM support..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building the project..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please fix the errors and try again."
    exit 1
fi

echo "✅ Build completed successfully!"

# Deploy instructions
echo ""
echo "🌐 Deployment Instructions:"
echo "1. For Vercel: The vercel.json file is already configured with proper CORS headers"
echo "2. For other platforms, ensure these headers are set:"
echo "   - Cross-Origin-Embedder-Policy: require-corp"
echo "   - Cross-Origin-Opener-Policy: same-origin"
echo "   - Content-Type: application/wasm (for .wasm files)"
echo ""
echo "🔧 Stockfish WASM Configuration:"
echo "- Single-threaded mode to avoid threading issues"
echo "- Reduced hash size to prevent memory problems"
echo "- Proper timeout handling"
echo ""
echo "📊 The app now includes:"
echo "- Real-time accuracy analysis during gameplay"
echo "- Fallback to mock analysis if Stockfish fails"
echo "- Proper CORS headers for WASM files"
echo "- Enhanced error handling and logging"

echo ""
echo "🎯 Ready for deployment!"

