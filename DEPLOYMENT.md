# Chess Trainer - Deployment Guide

## 🚀 Stockfish WASM Deployment Fix

This guide helps you deploy the Chess Trainer app with proper Stockfish WASM support to prevent the "unreachable" runtime errors.

## 🔧 What We Fixed

### 1. **CORS Headers Configuration**
- Added proper CORS headers for WASM files
- Configured `Cross-Origin-Embedder-Policy: require-corp`
- Set `Cross-Origin-Opener-Policy: same-origin`
- Added `Content-Type: application/wasm` for .wasm files

### 2. **Stockfish Configuration**
- **Single-threaded mode** to avoid threading issues
- **Reduced hash size** (16MB) to prevent memory problems
- **Proper timeout handling** (30 seconds max)
- **Enhanced error handling** with fallback to mock analysis

### 3. **Deployment Files**
- `vercel.json` - Vercel deployment configuration
- `next.config.ts` - Next.js headers configuration
- `deploy.sh` - Automated deployment script

## 📁 Files Added/Modified

### New Files:
- `src/utils/stockfishAnalysis.ts` - Safe Stockfish analysis engine
- `vercel.json` - Vercel CORS headers
- `deploy.sh` - Deployment script
- `DEPLOYMENT.md` - This guide

### Modified Files:
- `next.config.ts` - Added CORS headers
- `src/contexts/DatabaseContext.tsx` - Enhanced accuracy analysis

## 🚀 Deployment Instructions

### For Vercel:
```bash
# The vercel.json file is already configured
npm run build
vercel deploy
```

### For Other Platforms:

#### 1. **Nginx Configuration**
```nginx
location /stockfish.wasm {
    add_header 'Cross-Origin-Embedder-Policy' 'require-corp';
    add_header 'Cross-Origin-Opener-Policy' 'same-origin';
    add_header 'Cross-Origin-Resource-Policy' 'cross-origin';
    add_header 'Content-Type' 'application/wasm';
}

location /stockfish.js {
    add_header 'Cross-Origin-Embedder-Policy' 'require-corp';
    add_header 'Cross-Origin-Opener-Policy' 'same-origin';
    add_header 'Cross-Origin-Resource-Policy' 'cross-origin';
}
```

#### 2. **Apache Configuration**
```apache
<Files "stockfish.wasm">
    Header set Cross-Origin-Embedder-Policy "require-corp"
    Header set Cross-Origin-Opener-Policy "same-origin"
    Header set Cross-Origin-Resource-Policy "cross-origin"
    Header set Content-Type "application/wasm"
</Files>

<Files "stockfish.js">
    Header set Cross-Origin-Embedder-Policy "require-corp"
    Header set Cross-Origin-Opener-Policy "same-origin"
    Header set Cross-Origin-Resource-Policy "cross-origin"
</Files>
```

#### 3. **Docker Configuration**
```dockerfile
# Add to your Dockerfile
COPY --from=node:18-alpine /usr/local/bin/node /usr/local/bin/
RUN apk add --no-cache curl
```

## 🧪 Testing the Fix

### 1. **Local Testing**
```bash
npm run dev
# Open browser console and look for:
# ✅ Analysis engine initialized for real-time accuracy
# 🔧 Stockfish analysis engine ready
```

### 2. **Production Testing**
```bash
npm run build
npm start
# Check browser console for Stockfish initialization
```

### 3. **Expected Console Output**
```
🧪 Testing accuracy functions:
  - Win% for +100cp: [calculated value]
  - Win% for -100cp: [calculated value]
  - Win% for 0cp: [calculated value]
  - Accuracy for 50->60 win%: [calculated value]
  - Accuracy for 50->40 win%: [calculated value]
  - Accuracy for 50->50 win%: [calculated value]

✅ Analysis engine initialized for real-time accuracy
🔧 Stockfish analysis engine ready
```

## 🔍 Troubleshooting

### If Stockfish Still Crashes:

1. **Check Browser Console** for specific error messages
2. **Verify CORS Headers** are properly set
3. **Check Network Tab** for failed WASM requests
4. **Try Mock Analysis** - the app will fallback automatically

### Common Issues:

#### 1. **"Unreachable" Error Still Occurs**
- Ensure CORS headers are set correctly
- Check if WASM files are served with correct MIME type
- Verify browser supports SharedArrayBuffer

#### 2. **Stockfish Not Loading**
- Check network requests for 404 errors
- Verify `stockfish.js` and `stockfish.wasm` are in public folder
- Check browser console for import errors

#### 3. **Analysis Always Returns 0**
- This means Stockfish failed and mock analysis is being used
- Check console for "Stockfish analysis failed" messages
- Verify the analysis engine initialized successfully

## 📊 Features Now Working

### ✅ **Real-time Accuracy Analysis**
- Analyzes each player move during gameplay
- Uses Lichess accuracy formulas
- Falls back to mock analysis if Stockfish fails

### ✅ **Enhanced Error Handling**
- Graceful fallback to mock analysis
- Detailed console logging for debugging
- Proper timeout handling

### ✅ **Production Ready**
- CORS headers configured for all major platforms
- Single-threaded Stockfish to avoid threading issues
- Optimized memory usage

## 🎯 Next Steps

1. **Deploy** using the provided configuration
2. **Test** the accuracy analysis in production
3. **Monitor** console logs for any remaining issues
4. **Optimize** Stockfish settings based on performance

The app should now work without Stockfish WASM crashes! 🎉

