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

      if (!result || !result.quotes || !Array.isArray(result.quotes) || result.quotes.length === 0) {
        return null;
      }

      // Map library output to our app's expected format
      const candles = result.quotes.map(q => ({
        timestamp: q.date ? new Date(q.date).getTime() : 0,
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
        volume: q.volume
      })).filter(c => 
          c.timestamp > 0 && 
          c.close !== null && 
          c.close !== undefined && 
          c.volume !== null
      );

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

      // Parallel fetch for chart and quote
      const [chartResult, quoteResult] = await Promise.all([
         yahooFinance.chart(ticker, queryOptions).catch(() => null),
         yahooFinance.quote(ticker).catch(() => null)
      ]);

      if (!chartResult || !chartResult.quotes || chartResult.quotes.length === 0) return null;

      // Filter and map candles
      let allCandles = chartResult.quotes.map(q => ({
        time: q.date ? new Date(q.date).getTime() : 0,
        price: q.close,
        dateStr: q.date ? new Date(q.date).toDateString() : ''
      })).filter(c => c.price !== null && c.time > 0);

      if (allCandles.length === 0) return null;

      // Extract only the last trading day's data
      const lastDateStr = allCandles[allCandles.length - 1].dateStr;
      const todaysCandles = allCandles.filter(c => c.dateStr === lastDateStr);

      const currentPrice = quoteResult?.regularMarketPrice || chartResult.meta?.regularMarketPrice || todaysCandles[todaysCandles.length-1].price;
      const prevClose = quoteResult?.regularMarketPreviousClose || chartResult.meta?.chartPreviousClose || currentPrice;

      return {
        symbol: symbol,
        currency: chartResult.meta?.currency || 'INR',
        previousClose: prevClose,
        currentPrice: currentPrice,
        candles: todaysCandles
      };
    } catch (error) {
      console.error(`Yahoo Search Error (${symbol}):`, error.message);
      return null;
    }
  }
}

export const yahooService = new YahooService();