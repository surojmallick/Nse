import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const technicalindicators = require('technicalindicators');

const { EMA, RSI, ADX, ATR, VWAP } = technicalindicators;

export const calculateIndicators = (candles) => {
  const close = candles.map(c => c.close);
  const high = candles.map(c => c.high);
  const low = candles.map(c => c.low);
  const volume = candles.map(c => c.volume);

  // Input for Technical Indicators
  const period9 = 9;
  const period21 = 21;
  const period50 = 50;

  const ema9 = EMA.calculate({ period: period9, values: close });
  const ema21 = EMA.calculate({ period: period21, values: close });
  const ema50 = EMA.calculate({ period: period50, values: close });

  const rsi = RSI.calculate({ period: 14, values: close });

  // ADX requires high, low, close
  const adx = ADX.calculate({ period: 14, high, low, close });

  // ATR
  const atr = ATR.calculate({ period: 14, high, low, close });

  // VWAP
  const vwapInput = {
    high: high,
    low: low,
    close: close,
    volume: volume
  };
  const vwap = VWAP.calculate(vwapInput);

  // Return the latest values, aligning arrays
  return {
    ema9: ema9[ema9.length - 1],
    ema21: ema21[ema21.length - 1],
    ema50: ema50[ema50.length - 1],
    rsi: rsi[rsi.length - 1],
    adx: adx[adx.length - 1]?.adx, 
    atr: atr[atr.length - 1],
    vwap: vwap[vwap.length - 1],
    averageVolume: volume.slice(-20).reduce((a, b) => a + b, 0) / 20 
  };
};