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

  // Parallel processing using Promise.all to ensure execution stays within Vercel timeout limits
  const scanPromises = SYMBOLS.map(async (stock) => {
    try {
      // 1. Fetch Candles
      const candles = await yahooService.getCandles(stock);
      if (!candles || candles.length < 55) { // Need enough for EMA50
         return; 
      }

      const latestCandle = candles[candles.length - 1];
      
      // Use completed candle for signal confirmation, but latest price for execution checks
      const price = latestCandle.close;

      // 2. Pre-filter by Price Range
      if (price < 50 || price > 15000) return; 

      // 3. Calculate Indicators
      const ind = calculateIndicators(candles);
      
      if (!ind.ema9 || !ind.ema21 || !ind.ema50 || !ind.rsi || !ind.adx || !ind.atr || !ind.vwap) {
        return;
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
        
        // 5. NSE Validation (Optional / Fallback)
        let nseNote = "";
        let nseLtp = null;
        
        try {
            nseLtp = await nseService.getLTP(stock);
        } catch (err) {
            console.warn(`NSE blocked or failed for ${stock}, continuing with Yahoo data.`);
        }
        
        // If NSE works, perform arbitrage check
        if (nseLtp) {
            const priceDiff = Math.abs(price - nseLtp);
            const diffPercent = (priceDiff / nseLtp) * 100;

            // Reject if > 0.5% difference
            if (diffPercent > 0.5) {
                console.warn(`Skipping ${stock}: Price mismatch. Yahoo: ${price}, NSE: ${nseLtp}`);
                return;
            }
        } else {
            // Fallback logic for Vercel/Cloud deployments where NSE blocks requests
            nseNote = " (Yahoo Data Only)";
        }

        // 6. Risk Logic
        // SL = max(0.25% or 0.8 * ATR)
        const slDist = Math.max(price * 0.0025, 0.8 * ind.atr);
        const stopLoss = price - slDist;
        const risk = price - stopLoss;
        
        // Target 1.5R (Conservative for intraday)
        const reward = risk * 1.5;
        const target = price + reward;

        const confidence = Math.min(100, (ind.adx + ind.rsi) / 2).toFixed(1);

        results.push({
          stock,
          direction: 'BUY',
          price: price.toFixed(2),
          entryRange: `${(price * 0.9995).toFixed(2)} - ${(price * 1.0005).toFixed(2)}`,
          stopLoss: stopLoss.toFixed(2),
          target: target.toFixed(2),
          confidenceScore: confidence,
          reason: `High Vol Breakout | RSI: ${ind.rsi.toFixed(1)} | ADX: ${ind.adx.toFixed(1)}${nseNote}`,
          timestamp: new Date().toISOString()
        });
      }

    } catch (e) {
      errors.push(`${stock}: ${e.message}`);
    }
  });

  await Promise.all(scanPromises);

  return results;
};