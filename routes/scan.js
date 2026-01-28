import express from 'express';
import { runScan } from '../logic/scanLogic.js';

const router = express.Router();

let cache = {
  data: [],
  lastFetch: 0
};

router.get('/', async (req, res) => {
  // Simple in-memory cache for 30 seconds to prevent spamming APIs
  const now = Date.now();
  if (cache.data.length > 0 && (now - cache.lastFetch < 30000)) {
    return res.json({ 
      status: 'cached', 
      results: cache.data, 
      count: cache.data.length,
      timestamp: cache.lastFetch 
    });
  }

  try {
    const results = await runScan();
    
    // Fail-safe requirement
    if (results.length === 0) {
       // We return an empty list, frontend handles "NO SAFE TRADE"
       // Or we can return the specific message object
       cache.data = [];
       cache.lastFetch = now;
       return res.json({ status: 'success', results: [], message: "NO SAFE TRADE AVAILABLE", timestamp: now });
    }

    cache.data = results;
    cache.lastFetch = now;
    
    res.json({
      status: 'success',
      results: results,
      timestamp: now
    });

  } catch (error) {
    console.error('Scan error:', error);
    res.status(500).json({ 
        status: 'error', 
        message: "NO SAFE TRADE AVAILABLE", 
        detail: error.message 
    });
  }
});

export default router;