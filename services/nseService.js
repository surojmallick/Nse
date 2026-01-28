import axios from 'axios';

// Singleton to manage NSE session
class NSEService {
  constructor() {
    this.cookies = '';
    this.lastCookieFetch = 0;
    this.cookieExpiry = 5 * 60 * 1000; // 5 minutes
    this.baseUrl = 'https://www.nseindia.com';
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  async getCookies() {
    if (this.cookies && (Date.now() - this.lastCookieFetch < this.cookieExpiry)) {
      return this.cookies;
    }

    try {
      const response = await axios.get(this.baseUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml',
        },
        timeout: 1000 // Ultra short timeout
      });

      const setCookie = response.headers['set-cookie'];
      if (setCookie) {
        this.cookies = setCookie.map(c => c.split(';')[0]).join('; ');
        this.lastCookieFetch = Date.now();
      }
      return this.cookies;
    } catch (error) {
      return null;
    }
  }

  async getLTP(symbol) {
    try {
      const cookies = await this.getCookies();
      
      const url = `${this.baseUrl}/api/quote-equity?symbol=${encodeURIComponent(symbol)}`;
      
      const response = await axios.get(url, {
        headers: {
          'Cookie': cookies || '',
          'User-Agent': this.userAgent,
          'Accept': '*/*',
          'Host': 'www.nseindia.com',
          'Referer': `https://www.nseindia.com/get-quotes/equity?symbol=${symbol}`
        },
        timeout: 1500 // Fast fail
      });

      if (response.data && response.data.priceInfo) {
        return response.data.priceInfo.lastPrice;
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}

export const nseService = new NSEService();