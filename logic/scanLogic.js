import { nseService } from '../services/nseService.js';
import { yahooService } from '../services/yahooService.js';
import { calculateIndicators } from '../services/indicatorService.js';

// Reduced list to prevent Rate Limiting (Data Disruption)
const SYMBOLS = [
  'RELIANCE', 'HDFCBANK', 'INFY', 'TCS', 'ICICIBANK',
  'SBIN', 'BHARTIARTL', 'TATAMOTORS', 'BAJFINANCE', 'MARUTI'
];

export const runScan = async (riskLevel = 'MEDIUM') => {
  const results = [];
  
  // Process in chunks of 5 to avoid IP Ban/Rate Limit
  const chunkSize = 5;
  for (let i = 0; i < SYMBOLS.length; i += chunkSize) {
    const chunk = SYMBOLS.slice(i, i + chunkSize);
    
    // Process chunk in parallel
    const chunkPromises = chunk.map(async (stock) => {
        try {
            // 1. Fetch Candles
            const candles = await yahooService.getCandles(stock);
            if (!candles || candles.length < 55) return; // Silent return if data fails

            const latestCandle = candles[candles.length - 1];
            const price = latestCandle.close;

            // 2. Indicators
            const ind = calculateIndicators(candles);
            if (!ind.ema9 || !ind.rsi) return;

            // 3. Logic based on Risk Level
            let valid = false;
            let reason = '';
            let stopLoss = 0;
            let target = 0;

            // Common Indicators
            const isUptrend = ind.ema9 > ind.ema21;
            const strongUptrend = isUptrend && (ind.ema21 > ind.ema50);
            const isRsiBullish = ind.rsi > 50;
            const isRsiStrong = ind.rsi > 60 && ind.rsi < 80;
            const isVolatile = ind.atr > (price * 0.002);
            const isVolumeHigh = latestCandle.volume > ind.averageVolume;

            switch (riskLevel) {
                case 'HIGH':
                // Easy Rules: Just basic uptrend OR strong RSI
                if (isUptrend || isRsiBullish) {
                    valid = true;
                    reason = isUptrend ? 'Basic Uptrend' : 'RSI Momentum';
                }
                break;

                case 'MEDIUM':
                // Standard: Uptrend AND (RSI OK OR Volume OK)
                if (isUptrend && (isRsiBullish || isVolumeHigh)) {
                    valid = true;
                    reason = 'Trend + Momentum';
                }
                break;

                case 'LOW':
                // Strict: Strong Uptrend AND RSI Strong AND Volume High
                if (strongUptrend && isRsiStrong && isVolumeHigh) {
                    valid = true;
                    reason = 'High Conviction Setup';
                }
                break;
            }

            if (valid) {
                // 4. NSE Check (Best Effort - Don't fail if NSE blocks)
                let nseNote = "";
                try {
                    const nseLtp = await nseService.getLTP(stock);
                    if (nseLtp) {
                        const diff = Math.abs(price - nseLtp) / nseLtp;
                        if (diff > 0.01) nseNote = " (Price Divergence)";
                    } else {
                        nseNote = " (Delayed)";
                    }
                } catch (e) {
                    nseNote = " (Delayed)";
                }

                // 5. Targets (Risk adjusted)
                const atrMultiplier = riskLevel === 'HIGH' ? 1.5 : (riskLevel === 'MEDIUM' ? 1.0 : 0.8);
                const slDist = ind.atr * atrMultiplier;
                
                stopLoss = price - slDist;
                const reward = slDist * (riskLevel === 'HIGH' ? 2 : 1.5);
                target = price + reward;

                const confidence = (ind.rsi + (isUptrend ? 20 : 0) + (isVolumeHigh ? 10 : 0)).toFixed(0);

                results.push({
                stock,
                direction: 'BUY',
                price: price.toFixed(2),
                entryRange: `${(price * 0.999).toFixed(2)} - ${(price * 1.001).toFixed(2)}`,
                stopLoss: stopLoss.toFixed(2),
                target: target.toFixed(2),
                confidenceScore: Math.min(99, confidence).toString(),
                reason: `${reason} | RSI: ${ind.rsi.toFixed(0)}${nseNote}`,
                timestamp: new Date().toISOString()
                });
            }

        } catch (e) {
            // Log but don't stop scanning
            console.error(`Error scanning ${stock}:`, e.message);
        }
    });

    await Promise.all(chunkPromises);
    // Small delay between chunks to be nice to API
    if (i + chunkSize < SYMBOLS.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results.sort((a,b) => parseFloat(b.confidenceScore) - parseFloat(a.confidenceScore));
};