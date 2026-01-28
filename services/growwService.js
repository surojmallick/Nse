import axios from 'axios';

class GrowwService {
  constructor() {
    this.headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://groww.in/'
    };
  }

  async getLivePrice(symbol) {
    try {
        // Step 1: Search for the scrip to get the unique ID
        const searchUrl = `https://groww.in/v1/api/search/v1/entity?app=false&page=0&q=${encodeURIComponent(symbol)}&size=1`;
        
        const searchRes = await axios.get(searchUrl, { headers: this.headers, timeout: 3000 });
        
        if (!searchRes.data || !searchRes.data.content || searchRes.data.content.length === 0) {
            return null;
        }

        const item = searchRes.data.content[0];
        const searchId = item.search_id;

        // Step 2: Get Live Data
        const priceUrl = `https://groww.in/v1/api/stocks_data/v1/company/search_id/${searchId}`;
        const priceRes = await axios.get(priceUrl, { headers: this.headers, timeout: 3000 });
        
        const data = priceRes.data;
        if (!data || !data.live_price_dto) return null;

        const live = data.live_price_dto;

        return {
            ltp: live.ltp,
            change: live.day_change,
            changePercent: live.day_change_percentage,
            open: live.open,
            high: live.high,
            low: live.low,
            close: data.close, // Previous Close
            symbol: data.header.nse_script_code || symbol,
            source: 'Groww'
        };
    } catch (error) {
        // Silent fail for scan logic, but log for debug
        return null;
    }
  }
}

export const growwService = new GrowwService();