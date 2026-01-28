import express from 'express';
import { runScan } from '../logic/scanLogic.js';

const router = express.Router();

let cache = {
  data: {}, // Cache by risk level
  lastFetch: {}
};

router.get('/', async (req, res) => {
  const risk = req.query.risk || 'MEDIUM';
  const now = Date.now();
  
  // Cache key based on risk level
  const cacheKey = risk;

  // 30s Cache
  if (cache.data[cacheKey] && cache.data[cacheKey].length > 0 && (now - (cache.lastFetch[cacheKey] || 0) < 30000)) {
    return res.json({ 
      status: 'cached', 
      results: cache.data[cacheKey], 
      count: cache.data[cacheKey].length,
      timestamp: cache.lastFetch[cacheKey] 
    });
  }

  try {
    const results = await runScan(risk);
    
    if (results.length === 0) {
       return res.json({ status: 'success', results: [], message: "No stocks matched criteria.", timestamp: now });
    }

    cache.data[cacheKey] = results;
    cache.lastFetch[cacheKey] = now;
    
    res.json({
      status: 'success',
      results: results,
      timestamp: now
    });

  } catch (error) {
    console.error('Scan error:', error);
    res.status(500).json({ 
        status: 'error', 
        message: "Scan Failed", 
        detail: error.message 
    });
  }
});

export default router;