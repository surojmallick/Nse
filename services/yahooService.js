import axios from 'axios';

class YahooService {
  // Fetch last 1 day of 5m candles
  async getCandles(symbol) {
    try {
      // Yahoo symbol for NSE stocks is usually SYMBOL.NS
      const ticker = `${symbol}.NS`;
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`;
      
      const response = await axios.get(url, {
        params: {
          interval: '5m',
          range: '5d', // Get 5 days to ensure enough data for EMA50
        },
        headers: {
            'User-Agent': 'Mozilla/5.0'
        }
      });

      const result = response.data?.chart?.result?.[0];
      if (!result) return null;

      const meta = result.meta;
      const quotes = result.indicators.quote[0];
      const timestamps = result.timestamp;

      if (!timestamps || !quotes || !quotes.close) return null;

      // Format into array of objects
      const candles = timestamps.map((t, i) => ({
        timestamp: t * 1000,
        open: quotes.open[i],
        high: quotes.high[i],
        low: quotes.low[i],
        close: quotes.close[i],
        volume: quotes.volume[i]
      })).filter(c => c.close !== null && c.volume !== null); // Filter incomplete candles

      return candles;
    } catch (error) {
      console.error(`Yahoo Fetch failed for ${symbol}:`, error.message);
      return null;
    }
  }
}

export const yahooService = new YahooService();