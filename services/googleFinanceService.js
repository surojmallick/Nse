import axios from 'axios';

class GoogleFinanceService {
    constructor() {
        this.baseUrl = 'https://www.google.com/finance/quote';
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    }

    async getStockDetails(symbol) {
        try {
            // Google Finance format: SYMBOL:EXCHANGE (e.g., RELIANCE:NSE)
            const ticker = `${symbol.toUpperCase()}:NSE`;
            const url = `${this.baseUrl}/${ticker}`;
            
            const { data } = await axios.get(url, {
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5'
                },
                timeout: 5000
            });

            // Extract Data using Meta Tags (Most reliable method on Google Finance)
            const priceMatch = data.match(/<meta itemprop="price" content="([0-9.,]+)">/);
            const currencyMatch = data.match(/<meta itemprop="priceCurrency" content="([A-Z]+)">/);
            const changeMatch = data.match(/<meta itemprop="priceChange" content="([0-9.,-]+)">/);
            const changePercentMatch = data.match(/<meta itemprop="priceChangePercent" content="([0-9.,-]+)%?">/);

            if (priceMatch && priceMatch[1]) {
                 return {
                    price: parseFloat(priceMatch[1].replace(/,/g, '')),
                    change: changeMatch ? parseFloat(changeMatch[1].replace(/,/g, '')) : 0,
                    changePercent: changePercentMatch ? parseFloat(changePercentMatch[1].replace(/,/g, '')) : 0,
                    currency: currencyMatch ? currencyMatch[1] : 'INR',
                    source: 'Google Finance'
                 };
            }
            return null;
        } catch (e) {
            console.error(`Google Finance Error (${symbol}):`, e.message);
            return null;
        }
    }
}

export const googleService = new GoogleFinanceService();