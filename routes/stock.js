import express from 'express';
import { yahooService } from '../services/yahooService.js';
import { googleService } from '../services/googleFinanceService.js';

const router = express.Router();

// GET /api/stock/:symbol
router.get('/:symbol', async (req, res) => {
    const rawSymbol = req.params.symbol.toUpperCase();
    const symbol = rawSymbol.replace('.NS', '');

    try {
        // 1. Parallel Fetch: Chart (Yahoo) & Price (Google)
        // We use Google for price because it's more reliable/real-time than Yahoo's delayed feed.
        const [googleData, chartData] = await Promise.all([
            googleService.getStockDetails(symbol),
            yahooService.getIntradayChart(symbol)
        ]);
        
        // Validation
        if (!chartData && !googleData) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Stock not found or data unavailable' 
            });
        }

        // 2. Merge Data
        // Use Google data if available, otherwise fallback to Yahoo
        const currentPrice = googleData ? googleData.price : (chartData?.currentPrice || 0);
        const prevClose = chartData?.previousClose || currentPrice; // Fallback
        
        // Recalculate change if we have mixed data
        const change = googleData ? googleData.change : (currentPrice - prevClose);
        const changePercent = googleData ? googleData.changePercent : ((change / prevClose) * 100);

        res.json({
            status: 'success',
            data: {
                symbol: symbol,
                ltp: currentPrice,
                change: change.toFixed(2),
                changePercent: changePercent.toFixed(2),
                prevClose: prevClose,
                source: googleData ? 'Google Finance' : 'Yahoo (Delayed)',
                chart: chartData?.candles || []
            }
        });

    } catch (error) {
        console.error('Stock Search Error:', error);
        res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
});

export default router;