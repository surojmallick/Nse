import express from 'express';
import { yahooService } from '../services/yahooService.js';
import { nseService } from '../services/nseService.js';

const router = express.Router();

// GET /api/stock/:symbol
router.get('/:symbol', async (req, res) => {
    const rawSymbol = req.params.symbol.toUpperCase();
    // Remove .NS if user added it, we handle it in service
    const symbol = rawSymbol.replace('.NS', '');

    try {
        // 1. Get Chart Data (Yahoo)
        const chartData = await yahooService.getIntradayChart(symbol);
        
        if (!chartData) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Stock not found or data unavailable' 
            });
        }

        // 2. Try to get Real-time LTP from NSE (Optional)
        // This provides better accuracy than Yahoo's delayed feed if it works
        let ltp = chartData.currentPrice;
        let source = 'Yahoo (Delayed)';
        
        try {
            const nseLtp = await nseService.getLTP(symbol);
            if (nseLtp) {
                ltp = nseLtp;
                source = 'NSE (Real-time)';
            }
        } catch (e) {
            // Ignore NSE errors
        }

        // 3. Calculate Change
        const prevClose = chartData.previousClose;
        const change = ltp - prevClose;
        const changePercent = (change / prevClose) * 100;

        res.json({
            status: 'success',
            data: {
                symbol: symbol,
                ltp: ltp,
                change: change.toFixed(2),
                changePercent: changePercent.toFixed(2),
                prevClose: prevClose,
                source: source,
                chart: chartData.candles
            }
        });

    } catch (error) {
        console.error('Stock Search Error:', error);
        res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
});

export default router;