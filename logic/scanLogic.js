import { nseService } from '../services/nseService.js';
import { yahooService } from '../services/yahooService.js';
import { calculateIndicators } from '../services/indicatorService.js';

// Expanded Liquid List for better probability of finding setups
const SYMBOLS = [
  'RELIANCE', 'HDFCBANK', 'ICICIBANK', 'INFY', 'TCS', 
  'ITC', 'KOTAKBANK', 'LT', 'SBIN', 'BHARTIARTL', 
  'AXISBANK', 'ASIANPAINT', 'MARUTI', 'TITAN', 'BAJFINANCE'
];

export const runScan = async (riskLevel = 'MEDIUM') => {
  const results = [];
  
  // Process in chunks to avoid rate limiting
  const chunkSize = 5;
  for (let i = 0; i < SYMBOLS.length; i += chunkSize) {
    const chunk = SYMBOLS.slice(i, i + chunkSize);
    
    // Process chunk in parallel
    const chunkPromises = chunk.map(async (stock) => {
        try {
            // 1. Fetch Candles (Yahoo Finance)
            const candles = await yahooService.getCandles(stock);
            
            // Need at least 55 candles for EMA50 + lookback
            if (!candles || candles.length < 55) return; 

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

            // Common Signals
            const isUptrend = ind.ema9 > ind.ema21;
            const strongUptrend = isUptrend && (ind.ema21 > ind.ema50);
            const isRsiBullish = ind.rsi > 50;
            const isRsiStrong = ind.rsi > 60 && ind.rsi < 80; // < 80 to avoid extreme overbought
            const isVolumeHigh = latestCandle.volume > ind.averageVolume;

            switch (riskLevel) {
                case 'HIGH':
                // Loose: Uptrend OR RSI > 50
                if (isUptrend || isRsiBullish) {
                    valid = true;
                    reason = isUptrend ? 'Trend Following' : 'Momentum Play';
                }
                break;

                case 'MEDIUM':
                // Standard: Uptrend AND (RSI > 50 OR High Volume)
                if (isUptrend && (isRsiBullish || isVolumeHigh)) {
                    valid = true;
                    reason = 'Trend + Momentum';
                }
                break;

                case 'LOW':
                // Strict: Strong Uptrend + Strong RSI + Volume
                if (strongUptrend && isRsiStrong && isVolumeHigh) {
                    valid = true;
                    reason = 'High Conviction Setup';
                }
                break;
            }

            if (valid) {
                // 4. NSE Check (Optional / Best Effort)
                let nseNote = "";
                try {
                    const nseLtp = await nseService.getLTP(stock);
                    if (nseLtp) {
                        const diff = Math.abs(price - nseLtp) / nseLtp;
                        if (diff > 0.015) { // > 1.5% diff
                             nseNote = " (Price Divergence)";
                        }
                    } else {
                        nseNote = "";
                    }
                } catch (e) {
                    // Ignore NSE failures
                }

                // 5. Risk Management
                const atrMultiplier = riskLevel === 'HIGH' ? 1.5 : (riskLevel === 'MEDIUM' ? 1.0 : 0.8);
                const slDist = (ind.atr || (price * 0.01)) * atrMultiplier; // Fallback to 1% if ATR fails
                
                stopLoss = price - slDist;
                const rewardRatio = riskLevel === 'HIGH' ? 2 : 1.5;
                target = price + (slDist * rewardRatio);

                // Simple Confidence Score
                let confidence = ind.rsi; // Base is RSI
                if (isUptrend) confidence += 10;
                if (strongUptrend) confidence += 10;
                if (isVolumeHigh) confidence += 10;

                results.push({
                    stock,
                    direction: 'BUY',
                    price: price.toFixed(2),
                    entryRange: `${(price * 0.999).toFixed(2)} - ${(price * 1.001).toFixed(2)}`,
                    stopLoss: stopLoss.toFixed(2),
                    target: target.toFixed(2),
                    confidenceScore: Math.min(99, confidence).toFixed(0),
                    reason: `${reason} | RSI: ${ind.rsi.toFixed(0)}${nseNote}`,
                    timestamp: new Date().toISOString()
                });
            }

        } catch (e) {
            console.error(`Error scanning ${stock}:`, e.message);
        }
    });

    await Promise.all(chunkPromises);
    
    // Throttle slightly between chunks
    if (i + chunkSize < SYMBOLS.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  // Sort by confidence
  return results.sort((a,b) => parseFloat(b.confidenceScore) - parseFloat(a.confidenceScore));
};