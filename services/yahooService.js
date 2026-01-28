import axios from 'axios';

class YahooService {
  // Fetch last 5 days of 5m candles (used for Scan)
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
      // console.error(`Yahoo Fetch failed for ${symbol}`);
      return null;
    }
  }

  // Get Detailed Intraday Chart (Used for Search)
  async getIntradayChart(symbol) {
    try {
      const ticker = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`;
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}`;
      
      const response = await axios.get(url, {
        params: {
          interval: '5m',
          range: '5d', // Fetch 5d to guarantee we get the latest session even if 1d returns empty
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

      // Convert all data
      let allCandles = timestamps.map((t, i) => ({
        time: t * 1000,
        price: quotes.close[i],
        dateStr: new Date(t * 1000).toDateString()
      })).filter(c => c.price !== null);

      if (allCandles.length === 0) return null;

      // Extract only the last trading day's data
      const lastDateStr = allCandles[allCandles.length - 1].dateStr;
      const todaysCandles = allCandles.filter(c => c.dateStr === lastDateStr);

      return {
        symbol: meta.symbol,
        currency: meta.currency,
        previousClose: meta.chartPreviousClose,
        currentPrice: meta.regularMarketPrice,
        candles: todaysCandles
      };
    } catch (error) {
      console.error(`Yahoo Chart failed for ${symbol}:`, error.message);
      return null;
    }
  }
}

export const yahooService = new YahooService();