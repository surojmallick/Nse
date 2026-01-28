import { nseService } from '../services/nseService.js';
import { yahooService } from '../services/yahooService.js';
import { calculateIndicators } from '../services/indicatorService.js';

// Hardcoded volatile/liquid stocks for demo reliability
const SYMBOLS = [
  'RELIANCE', 'HDFCBANK', 'INFY', 'TCS', 'ICICIBANK',
  'SBIN', 'BHARTIARTL', 'KOTAKBANK', 'LT', 'AXISBANK',
  'TATAMOTORS', 'TATASTEEL', 'ADANIENT', 'BAJFINANCE', 'MARUTI'
];

export const runScan = async () => {
  const results = [];
  const errors = [];

  // Process sequentially to be gentle on APIs (or use small concurrency)
  for (const stock of SYMBOLS) {
    try {
      // 1. Fetch Candles
      const candles = await yahooService.getCandles(stock);
      if (!candles || candles.length < 55) { // Need enough for EMA50
         continue; 
      }

      const latestCandle = candles[candles.length - 1];
      const prevCandle = candles[candles.length - 2]; // Completed candle
      
      // Use completed candle for signal confirmation, but latest price for execution checks
      const price = latestCandle.close;

      // 2. Pre-filter by Price Range
      if (price < 50 || price > 15000) continue; // Adjusted upper limit for Nifty 50 stocks

      // 3. Calculate Indicators
      const ind = calculateIndicators(candles);
      
      if (!ind.ema9 || !ind.ema21 || !ind.ema50 || !ind.rsi || !ind.adx || !ind.atr || !ind.vwap) {
        continue;
      }

      // 4. Core Logic Checks
      // Trend: EMA Stack
      const isUptrend = ind.ema9 > ind.ema21 && ind.ema21 > ind.ema50;
      
      // Volume: 1.5x average
      const isHighVolume = latestCandle.volume >= (ind.averageVolume * 1.5);
      
      // Price > VWAP
      const isAboveVWAP = price > ind.vwap;

      // RSI Condition
      const isRsiValid = ind.rsi >= 55 && ind.rsi <= 70;

      // ADX Strength
      const isAdxStrong = ind.adx > 20;

      // ATR Volatility Check
      const isVolatileEnough = ind.atr >= (price * 0.0025);

      if (isUptrend && isHighVolume && isAboveVWAP && isRsiValid && isAdxStrong && isVolatileEnough) {
        
        // 5. NSE Validation (Strict)
        const nseLtp = await nseService.getLTP(stock);
        
        // If NSE fails, we cannot "Safely" trade according to constraints
        if (!nseLtp) {
            console.warn(`Skipping ${stock}: NSE LTP fetch failed.`);
            continue; 
        }

        const priceDiff = Math.abs(price - nseLtp);
        const diffPercent = (priceDiff / nseLtp) * 100;

        // Reject if > 0.5% difference (Arbitrage/Data lag too high)
        if (diffPercent > 0.5) {
            console.warn(`Skipping ${stock}: Price mismatch. Yahoo: ${price}, NSE: ${nseLtp}`);
            continue;
        }

        // 6. Risk Logic
        // SL = max(0.25% or 0.8 * ATR)
        const slDist = Math.max(price * 0.0025, 0.8 * ind.atr);
        const stopLoss = price - slDist;
        const risk = price - stopLoss;
        
        // Target 1.5R (Conservative for intraday)
        const reward = risk * 1.5;
        const target = price + reward;

        // RR Check (Implicitly 1.5 here, but logic requires check)
        // If Risk is too small (consolidated), it's good. If Risk is huge, check target feasibility?
        // Constraint: If RR < 1.2 -> no signal. Our calc forces 1.5R, so it passes.

        const confidence = Math.min(100, (ind.adx + ind.rsi) / 2).toFixed(1);

        results.push({
          stock,
          direction: 'BUY',
          price: price.toFixed(2),
          entryRange: `${(price * 0.9995).toFixed(2)} - ${(price * 1.0005).toFixed(2)}`,
          stopLoss: stopLoss.toFixed(2),
          target: target.toFixed(2),
          confidenceScore: confidence,
          reason: `High Vol Breakout | RSI: ${ind.rsi.toFixed(1)} | ADX: ${ind.adx.toFixed(1)}`,
          timestamp: new Date().toISOString()
        });
      }

    } catch (e) {
      errors.push(`${stock}: ${e.message}`);
    }
  }

  return results;
};