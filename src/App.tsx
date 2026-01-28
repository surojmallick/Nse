import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { ScanResult, ApiResponse } from './types';

// Utility for formatting time
const formatTime = (ts: number) => {
  return new Date(ts).toLocaleTimeString();
};

const App: React.FC = () => {
  const [results, setResults] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchScan = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // In dev, Vite proxies /api. In prod, same domain.
      const res = await axios.get<ApiResponse>('/api/scan');
      
      if (res.data.status === 'success' || res.data.status === 'cached') {
        setResults(res.data.results);
        setLastUpdated(res.data.timestamp);
        if (res.data.results.length === 0 && res.data.message) {
            setErrorMsg(res.data.message);
        }
      } else {
        setResults([]);
        setErrorMsg("NO SAFE TRADE AVAILABLE");
      }
    } catch (err) {
      console.error(err);
      setResults([]);
      setErrorMsg("NO SAFE TRADE AVAILABLE");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans p-4 pb-20">
      <header className="mb-6 flex flex-col items-center">
        <h1 className="text-3xl font-bold text-emerald-400 tracking-wider mb-2">INTRADAY HAWK</h1>
        <p className="text-xs text-gray-500 text-center max-w-md">
          Automatic screener using Yahoo Finance & NSE data. <br/>
          EMA + RSI + VWAP + VOL Strategy.
        </p>
      </header>

      {/* Controls */}
      <div className="flex flex-col items-center mb-8 gap-4 sticky top-4 z-50">
        <button
          onClick={fetchScan}
          disabled={loading}
          className={`px-8 py-3 rounded-full font-bold shadow-lg transition-all ${
            loading 
              ? 'bg-gray-700 cursor-not-allowed text-gray-400' 
              : 'bg-emerald-500 hover:bg-emerald-600 text-white active:scale-95'
          }`}
        >
          {loading ? 'SCANNING MARKETS...' : 'SCAN NOW'}
        </button>
        {lastUpdated && (
          <span className="text-xs text-gray-400 bg-gray-800 px-3 py-1 rounded-full">
            Last Fetch: {formatTime(lastUpdated)}
          </span>
        )}
      </div>

      {/* Results Area */}
      <main className="max-w-4xl mx-auto">
        {errorMsg ? (
          <div className="p-6 border border-red-800 bg-red-900/20 rounded-lg text-center">
            <h3 className="text-xl font-bold text-red-400 mb-2">STATUS: {errorMsg}</h3>
            <p className="text-sm text-gray-400">Market conditions may not meet high-probability criteria or data feeds are interrupted.</p>
          </div>
        ) : results.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            {results.map((item, idx) => (
              <div key={idx} className="bg-gray-800 border-l-4 border-emerald-500 rounded-r-lg p-5 shadow-xl relative overflow-hidden group">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 p-4 opacity-10 font-black text-6xl text-emerald-500 select-none group-hover:opacity-20 transition-opacity">
                  {item.stock}
                </div>
                
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{item.stock}</h2>
                    <span className="inline-block bg-emerald-900 text-emerald-300 text-xs px-2 py-1 rounded mt-1 font-semibold">
                      {item.direction}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-xs uppercase">Confidence</p>
                    <p className="text-xl font-bold text-emerald-400">{item.confidenceScore}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm mb-4">
                  <div>
                    <p className="text-gray-500 text-xs uppercase">Entry</p>
                    <p className="font-mono text-white">{item.entryRange}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase">LTP</p>
                    <p className="font-mono text-white">₹{item.price}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase">Stop Loss</p>
                    <p className="font-mono text-red-400 font-bold">₹{item.stopLoss}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs uppercase">Target</p>
                    <p className="font-mono text-green-400 font-bold">₹{item.target}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-700">
                  <p className="text-xs text-gray-400 italic">{item.reason}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !loading && (
            <div className="text-center text-gray-500 mt-10">
              <p>Hit "SCAN NOW" to search for setups.</p>
            </div>
          )
        )}
      </main>

      {/* Footer / Disclaimer */}
      <footer className="mt-12 pt-6 border-t border-gray-800 text-center text-gray-600 text-[10px] space-y-2">
        <p>
          DATA DELAY WARNING: Prices are near-real-time (10-60s delay). 
          NSE validation is server-side check only.
        </p>
        <p className="max-w-2xl mx-auto">
          DISCLAIMER: This tool is for educational purposes only. 
          No financial advice provided. Trading carries significant risk. 
          Developer is not responsible for losses.
        </p>
      </footer>
    </div>
  );
};

export default App;