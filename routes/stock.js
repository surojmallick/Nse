import express from 'express';
import { yahooService } from '../services/yahooService.js';
import { growwService } from '../services/growwService.js';

const router = express.Router();

// GET /api/stock/:symbol
router.get('/:symbol', async (req, res) => {
    const rawSymbol = req.params.symbol.toUpperCase();
    const symbol = rawSymbol.replace('.NS', '');

    try {
        // 1. Parallel Fetch: Chart (Yahoo) & Price (Groww)
        const [growwData, chartData] = await Promise.all([
            growwService.getLivePrice(symbol),
            yahooService.getIntradayChart(symbol)
        ]);
        
        if (!chartData && !growwData) {
            return res.status(404).json({ 
                status: 'error', 
                message: 'Stock not found or data unavailable' 
            });
        }

        // 2. Merge Data
        // Groww is primary for Price (LTP)
        const currentPrice = growwData ? growwData.ltp : (chartData?.currentPrice || 0);
        const prevClose = growwData ? growwData.close : (chartData?.previousClose || currentPrice);
        
        // Recalculate change if necessary
        const change = growwData ? growwData.change : (currentPrice - prevClose);
        const changePercent = growwData ? growwData.changePercent : ((change / prevClose) * 100);

        res.json({
            status: 'success',
            data: {
                symbol: symbol,
                ltp: currentPrice,
                change: change ? change.toFixed(2) : '0.00',
                changePercent: changePercent ? changePercent.toFixed(2) : '0.00',
                prevClose: prevClose,
                source: growwData ? 'Groww API' : 'Yahoo (Delayed)',
                chart: chartData?.candles || []
            }
        });

    } catch (error) {
        console.error('Stock Search Error:', error);
        res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
});

export default router;