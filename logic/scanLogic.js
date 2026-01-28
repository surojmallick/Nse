import { growwService } from '../services/growwService.js';
import { yahooService } from '../services/yahooService.js';
import { calculateIndicators } from '../services/indicatorService.js';

// Liquid Stocks List
const SYMBOLS = [
  'RELIANCE', 'HDFCBANK', 'ICICIBANK', 'INFY', 'TCS', 
  'ITC', 'KOTAKBANK', 'LT', 'SBIN', 'BHARTIARTL', 
  'AXISBANK', 'ASIANPAINT', 'MARUTI', 'TITAN', 'BAJFINANCE'
];

export const runScan = async (riskLevel = 'MEDIUM') => {
  const results = [];
  
  // Process in chunks of 5
  const chunkSize = 5;
  for (let i = 0; i < SYMBOLS.length; i += chunkSize) {
    const chunk = SYMBOLS.slice(i, i + chunkSize);
    
    const chunkPromises = chunk.map(async (stock) => {
        try {
            // 1. Fetch Candles (Yahoo - Best for History/Indicators)
            const candles = await yahooService.getCandles(stock);
            
            // Need historical data for EMA/RSI
            if (!candles || candles.length < 55) return; 

            // 2. Fetch Live Price (Groww - Best for Realtime)
            const growwData = await growwService.getLivePrice(stock);
            
            const latestCandle = candles[candles.length - 1];
            // Use Groww price if available, else Candle close
            const price = growwData ? growwData.ltp : latestCandle.close;

            // 3. Indicators
            const ind = calculateIndicators(candles);
            if (!ind.ema9 || !ind.rsi) return;

            // 4. Logic based on Risk Level
            let valid = false;
            let reason = '';
            let stopLoss = 0;
            let target = 0;

            const isUptrend = ind.ema9 > ind.ema21;
            const strongUptrend = isUptrend && (ind.ema21 > ind.ema50);
            const isRsiBullish = ind.rsi > 50;
            const isRsiStrong = ind.rsi > 60 && ind.rsi < 80;
            const isVolumeHigh = latestCandle.volume > ind.averageVolume;

            switch (riskLevel) {
                case 'HIGH':
                if (isUptrend || isRsiBullish) {
                    valid = true;
                    reason = isUptrend ? 'Trend Following' : 'Momentum Play';
                }
                break;

                case 'MEDIUM':
                if (isUptrend && (isRsiBullish || isVolumeHigh)) {
                    valid = true;
                    reason = 'Trend + Momentum';
                }
                break;

                case 'LOW':
                if (strongUptrend && isRsiStrong && isVolumeHigh) {
                    valid = true;
                    reason = 'High Conviction Setup';
                }
                break;
            }

            if (valid) {
                // Price Validation Logic
                let dataNote = "";
                if (growwData) {
                    // Check for divergence between Live (Groww) and Candle (Yahoo)
                    const diff = Math.abs(price - latestCandle.close) / price;
                    if (diff > 0.01) {
                        dataNote = " (Realtime Updated)";
                    }
                } else {
                    dataNote = " (Delayed)";
                }

                // Targets
                const atrMultiplier = riskLevel === 'HIGH' ? 1.5 : (riskLevel === 'MEDIUM' ? 1.0 : 0.8);
                const slDist = (ind.atr || (price * 0.01)) * atrMultiplier;
                
                stopLoss = price - slDist;
                const rewardRatio = riskLevel === 'HIGH' ? 2 : 1.5;
                target = price + (slDist * rewardRatio);

                let confidence = ind.rsi;
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
                    reason: `${reason} | RSI: ${ind.rsi.toFixed(0)}${dataNote}`,
                    timestamp: new Date().toISOString()
                });
            }

        } catch (e) {
            console.error(`Error scanning ${stock}:`, e.message);
        }
    });

    await Promise.all(chunkPromises);
    
    // Throttle slightly
    if (i + chunkSize < SYMBOLS.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  return results.sort((a,b) => parseFloat(b.confidenceScore) - parseFloat(a.confidenceScore));
};