import yahooFinance from 'yahoo-finance2';

// Suppress non-critical notices
yahooFinance.suppressNotices(['yahooSurvey']);

class YahooService {
  // Fetch last 5 days of 5m candles (used for Scan)
  async getCandles(symbol) {
    try {
      // Yahoo-finance2 handles the .NS suffix logic, but we ensure it's present
      const ticker = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`;
      
      const queryOptions = {
        period1: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        interval: '5m',
      };

      const result = await yahooFinance.chart(ticker, queryOptions);

      if (!result || !result.quotes || result.quotes.length === 0) return null;

      // Map library output to our app's expected format
      // Library returns Date objects for 'date', we convert to timestamp
      const candles = result.quotes.map(q => ({
        timestamp: q.date.getTime(),
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
        volume: q.volume
      })).filter(c => c.close !== null && c.volume !== null);

      return candles;
    } catch (error) {
      console.error(`Yahoo Data Error (${symbol}):`, error.message);
      return null;
    }
  }

  // Get Detailed Intraday Chart (Used for Search)
  async getIntradayChart(symbol) {
    try {
      const ticker = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`;
      
      const queryOptions = {
        period1: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days
        interval: '5m',
      };

      const result = await yahooFinance.chart(ticker, queryOptions);
      const quote = await yahooFinance.quote(ticker);

      if (!result || !result.quotes || result.quotes.length === 0) return null;

      // Filter and map candles
      let allCandles = result.quotes.map(q => ({
        time: q.date.getTime(),
        price: q.close,
        dateStr: q.date.toDateString()
      })).filter(c => c.price !== null);

      if (allCandles.length === 0) return null;

      // Extract only the last trading day's data
      const lastDateStr = allCandles[allCandles.length - 1].dateStr;
      const todaysCandles = allCandles.filter(c => c.dateStr === lastDateStr);

      return {
        symbol: symbol,
        currency: result.meta?.currency || 'INR',
        previousClose: result.meta?.chartPreviousClose || quote.regularMarketPreviousClose,
        currentPrice: quote.regularMarketPrice || result.meta?.regularMarketPrice,
        candles: todaysCandles
      };
    } catch (error) {
      console.error(`Yahoo Search Error (${symbol}):`, error.message);
      return null;
    }
  }
}

export const yahooService = new YahooService();