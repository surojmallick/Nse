import axios from 'axios';

class YahooService {
  // Fetch last 1 day of 5m candles
  async getCandles(symbol) {
    try {
      const ticker = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`;
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`;
      
      const response = await axios.get(url, {
        params: {
          interval: '5m',
          range: '5d', 
        },
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        }
      });

      const result = response.data?.chart?.result?.[0];
      if (!result) return null;

      const quotes = result.indicators.quote[0];
      const timestamps = result.timestamp;

      if (!timestamps || !quotes || !quotes.close) return null;

      const candles = timestamps.map((t, i) => ({
        timestamp: t * 1000,
        open: quotes.open[i],
        high: quotes.high[i],
        low: quotes.low[i],
        close: quotes.close[i],
        volume: quotes.volume[i]
      })).filter(c => c.close !== null && c.volume !== null);

      return candles;
    } catch (error) {
      console.error(`Yahoo Fetch failed for ${symbol}:`, error.message);
      return null;
    }
  }

  // New method for single stock search
  async getIntradayChart(symbol) {
    try {
      const ticker = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`;
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`;
      
      const response = await axios.get(url, {
        params: {
          interval: '5m',
          range: '1d', // Intraday specific
        },
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        }
      });

      const result = response.data?.chart?.result?.[0];
      if (!result) return null;

      const meta = result.meta;
      const quotes = result.indicators.quote[0];
      const timestamps = result.timestamp;

      if (!timestamps || !quotes) return null;

      const candles = timestamps.map((t, i) => ({
        time: t * 1000, // Normalized for Recharts
        price: quotes.close[i],
      })).filter(c => c.price !== null);

      return {
        symbol: meta.symbol,
        currency: meta.currency,
        previousClose: meta.chartPreviousClose,
        currentPrice: meta.regularMarketPrice,
        candles
      };
    } catch (error) {
      console.error(`Yahoo Chart failed for ${symbol}:`, error.message);
      return null;
    }
  }
}

export const yahooService = new YahooService();