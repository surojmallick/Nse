import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { Search, X, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ScanResult, ApiResponse, StockSearchResponse, StockDetails } from './types';

const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

const App: React.FC = () => {
  // Scan State
  const [results, setResults] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<StockDetails | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // --- SCAN LOGIC ---
  const fetchScan = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
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

  // --- SEARCH LOGIC ---
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    setSearchError(null);
    setSearchResult(null);

    try {
        const res = await axios.get<StockSearchResponse>(`/api/stock/${searchQuery.trim()}`);
        if (res.data.status === 'success') {
            setSearchResult(res.data.data);
        } else {
            setSearchError(res.data.message || 'Stock not found');
        }
    } catch (err: any) {
        setSearchError(err.response?.data?.message || 'Failed to fetch stock data');
    } finally {
        setSearchLoading(false);
    }
  };

  const closeSearch = () => {
      setSearchResult(null);
      setSearchError(null);
      setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans p-4 pb-20">
      
      {/* HEADER */}
      <header className="mb-6 flex flex-col items-center">
        <h1 className="text-3xl font-bold text-emerald-400 tracking-wider mb-2">INTRADAY HAWK</h1>
        <p className="text-xs text-gray-500 text-center max-w-md">
          Automatic screener using Yahoo Finance & NSE data. <br/>
          EMA + RSI + VWAP + VOL Strategy.
        </p>
      </header>

      {/* SEARCH BAR */}
      <div className="max-w-md mx-auto mb-8 relative z-50">
        <form onSubmit={handleSearch} className="relative">
            <input 
                type="text" 
                placeholder="Search Symbol (e.g. RELIANCE, TCS)" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-full py-3 pl-12 pr-4 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all shadow-lg placeholder-gray-500"
            />
            <Search className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
            <button 
                type="submit" 
                disabled={searchLoading || !searchQuery}
                className="absolute right-2 top-2 bg-emerald-600 hover:bg-emerald-500 text-white p-1.5 rounded-full disabled:opacity-50 transition-colors"
            >
                {searchLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Search className="w-4 h-4" />}
            </button>
        </form>

        {/* SEARCH ERROR */}
        {searchError && (
            <div className="mt-2 bg-red-900/30 border border-red-800 text-red-200 text-sm p-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {searchError}
            </div>
        )}

        {/* SEARCH RESULT CARD */}
        {searchResult && (
            <div className="mt-4 bg-gray-800 border border-gray-700 rounded-xl p-4 shadow-2xl relative animate-fade-in-down">
                <button onClick={closeSearch} className="absolute top-3 right-3 text-gray-400 hover:text-white">
                    <X className="w-5 h-5" />
                </button>
                
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <h2 className="text-2xl font-bold">{searchResult.symbol}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-2xl font-mono">₹{searchResult.ltp.toFixed(2)}</span>
                            <span className={`flex items-center text-sm font-bold px-1.5 py-0.5 rounded ${parseFloat(searchResult.change) >= 0 ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                                {parseFloat(searchResult.change) >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                                {searchResult.change} ({searchResult.changePercent}%)
                            </span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">Source: {searchResult.source}</p>
                    </div>
                </div>

                {/* CHART */}
                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={searchResult.chart}>
                            <XAxis 
                                dataKey="time" 
                                domain={['dataMin', 'dataMax']} 
                                tickFormatter={formatTime} 
                                hide 
                            />
                            <YAxis 
                                domain={['auto', 'auto']} 
                                hide 
                            />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#f3f4f6' }}
                                labelFormatter={(label) => formatTime(label)}
                                formatter={(value: number) => [`₹${value.toFixed(2)}`, 'Price']}
                            />
                            <ReferenceLine y={searchResult.prevClose} stroke="#6b7280" strokeDasharray="3 3" />
                            <Line 
                                type="monotone" 
                                dataKey="price" 
                                stroke={parseFloat(searchResult.change) >= 0 ? '#10b981' : '#ef4444'} 
                                strokeWidth={2} 
                                dot={false} 
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        )}
      </div>

      {/* SCREENER CONTROLS */}
      <div className="flex flex-col items-center mb-8 gap-4 sticky top-4 z-40">
        <button
          onClick={fetchScan}
          disabled={loading}
          className={`px-8 py-3 rounded-full font-bold shadow-lg transition-all ${
            loading 
              ? 'bg-gray-700 cursor-not-allowed text-gray-400' 
              : 'bg-emerald-500 hover:bg-emerald-600 text-white active:scale-95'
          }`}
        >
          {loading ? 'SCANNING MARKETS...' : 'SCAN FOR OPPORTUNITIES'}
        </button>
        {lastUpdated && (
          <span className="text-xs text-gray-400 bg-gray-800 px-3 py-1 rounded-full border border-gray-700">
            Last Scan: {formatTime(lastUpdated)}
          </span>
        )}
      </div>

      {/* RESULTS AREA */}
      <main className="max-w-4xl mx-auto">
        {errorMsg ? (
          <div className="p-6 border border-red-800 bg-red-900/20 rounded-lg text-center">
            <h3 className="text-xl font-bold text-red-400 mb-2">STATUS: {errorMsg}</h3>
            <p className="text-sm text-gray-400">Market conditions may not meet high-probability criteria or data feeds are interrupted.</p>
          </div>
        ) : results.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            {results.map((item, idx) => (
              <div key={idx} className="bg-gray-800 border-l-4 border-emerald-500 rounded-r-lg p-5 shadow-xl relative overflow-hidden group hover:bg-gray-750 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-5 font-black text-6xl text-emerald-500 select-none pointer-events-none">
                  {item.stock}
                </div>
                
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{item.stock}</h2>
                    <span className="inline-block bg-emerald-900/60 border border-emerald-800 text-emerald-300 text-xs px-2 py-1 rounded mt-1 font-semibold">
                      {item.direction}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-[10px] uppercase tracking-wider">Confidence</p>
                    <p className="text-xl font-bold text-emerald-400">{item.confidenceScore}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm mb-4 relative z-10">
                  <div>
                    <p className="text-gray-500 text-[10px] uppercase">Entry Zone</p>
                    <p className="font-mono text-gray-200">{item.entryRange}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-[10px] uppercase">Current Price</p>
                    <p className="font-mono text-white">₹{item.price}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-[10px] uppercase">Stop Loss</p>
                    <p className="font-mono text-red-400 font-bold">₹{item.stopLoss}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-[10px] uppercase">Target</p>
                    <p className="font-mono text-emerald-400 font-bold">₹{item.target}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-700 relative z-10">
                  <p className="text-xs text-gray-400 italic flex items-center gap-1">
                     <AlertCircle className="w-3 h-3" /> {item.reason}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !loading && (
            <div className="text-center text-gray-500 mt-20 flex flex-col items-center">
              <TrendingUp className="w-16 h-16 opacity-20 mb-4" />
              <p>Hit "SCAN" to search for intraday setups.</p>
            </div>
          )
        )}
      </main>

      {/* FOOTER */}
      <footer className="mt-12 pt-8 border-t border-gray-800 text-center text-gray-600 text-[10px] space-y-2">
        <p>
          DATA DELAY WARNING: Prices are near-real-time (10-60s delay). 
          NSE validation is server-side check only.
        </p>
        <p className="max-w-2xl mx-auto">
          DISCLAIMER: This tool is for educational purposes only. 
          No financial advice provided. Trading carries significant risk.
        </p>
      </footer>
    </div>
  );
};

export default App;