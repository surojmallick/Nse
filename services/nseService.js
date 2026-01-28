import axios from 'axios';

// Singleton to manage NSE session
class NSEService {
  constructor() {
    this.cookies = '';
    this.lastCookieFetch = 0;
    this.cookieExpiry = 5 * 60 * 1000; // 5 minutes
    this.baseUrl = 'https://www.nseindia.com';
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36';
  }

  async getCookies() {
    if (this.cookies && (Date.now() - this.lastCookieFetch < this.cookieExpiry)) {
      return this.cookies;
    }

    try {
      const response = await axios.get(this.baseUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 4000 // Short timeout for Vercel
      });

      const setCookie = response.headers['set-cookie'];
      if (setCookie) {
        this.cookies = setCookie.map(c => c.split(';')[0]).join('; ');
        this.lastCookieFetch = Date.now();
        console.log('NSE Cookies refreshed');
      }
      return this.cookies;
    } catch (error) {
      // Don't log full error on Vercel to keep logs clean, it is expected to fail often
      console.warn('NSE Cookie Fetch Warning (likely blocked):', error.message);
      return null;
    }
  }

  async getLTP(symbol) {
    try {
      const cookies = await this.getCookies();
      // On Vercel, cookies might be null if blocked, but we try anyway with empty cookies 
      // sometimes headers alone work for cached endpoints
      
      // NSE API endpoint for quote
      const url = `${this.baseUrl}/api/quote-equity?symbol=${encodeURIComponent(symbol)}`;
      
      const response = await axios.get(url, {
        headers: {
          'Cookie': cookies || '',
          'User-Agent': this.userAgent,
          'Accept': '*/*',
          'Host': 'www.nseindia.com',
          'Connection': 'keep-alive',
          'Referer': 'https://www.nseindia.com/get-quotes/equity?symbol=' + symbol
        },
        timeout: 3000 // Fast fail
      });

      if (response.data && response.data.priceInfo) {
        return response.data.priceInfo.lastPrice;
      }
      return null;
    } catch (error) {
      // NSE is very strict, often returns 401/403 for server-side requests
      // We swallow the error here so logic/scanLogic.js can decide to proceed or not
      return null;
    }
  }
}

export const nseService = new NSEService();