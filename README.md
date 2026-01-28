# Intraday Hawk - Stock Screener

A production-ready intraday stock screener web app using Yahoo Finance and NSE data.
Built with Node.js, Express, React, and Tailwind CSS.

## Features

- **Near-Real-Time Scanning:** 5m candles from Yahoo Finance.
- **NSE Validation:** Server-side cross-check with NSE public endpoints to filter out bad data.
- **Advanced Technicals:** EMA Stack, RSI, ADX, VWAP, ATR logic.
- **Risk Management:** Auto-calculated Stop Loss and Targets based on volatility.
- **Mobile First:** Responsive React UI.

## Project Structure

```
/project-root
 ├── server.js            # Express Backend
 ├── services/            # Data & Indicator Logic
 ├── logic/               # Scanning Orchestrator
 ├── public/              # Production Build Output (Frontend)
 ├── src/                 # React Source Code
```

## Prerequisites

- Node.js 18+

## Setup & Deployment

### 1. Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run backend and frontend concurrently (requires two terminals):
   Terminal 1 (Backend):
   ```bash
   npm start
   ```
   Terminal 2 (Frontend Dev Server):
   ```bash
   npm run dev
   ```

### 2. Production Build (Railway/Vercel)

The app is configured to serve the React frontend from the `public` directory via Express.

1. Build the frontend:
   ```bash
   npm run build
   ```
   *This compiles `src/` into `public/`.*

2. Start the server:
   ```bash
   npm start
   ```

### 3. Deploy to Railway

1. Push code to GitHub.
2. Connect repository to Railway.
3. Railway will automatically detect `package.json`.
4. Set the **Build Command** in Railway settings to: `npm install && npm run build`
5. Set the **Start Command** to: `npm start`
6. Ensure `PORT` variable is handled (Railway does this automatically).

## Disclaimer

Data is delayed. Use for educational purposes only.
