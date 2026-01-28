import React, { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { Search, X, TrendingUp, TrendingDown, AlertCircle, Shield, ShieldAlert, ShieldCheck, Wifi, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ScanResult, ApiResponse, StockSearchResponse, StockDetails } from './types';

const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

const App: React.FC = () => {
  // Scan State
  const [results, setResults] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [riskLevel, setRiskLevel] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  
  // System Status State
  const [systemStatus, setSystemStatus] = useState<'CONNECTING' | 'ONLINE' | 'OFFLINE'>('CONNECTING');

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<StockDetails | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Initial Health Check
  useEffect(() => {
    const checkHealth = async () => {
        try {
            await axios.get('/api/scan?risk=MEDIUM');
            setSystemStatus('ONLINE');
            fetchScan(); // Auto-fetch on load
        } catch (e) {
            setSystemStatus('OFFLINE');
        }
    };
    checkHealth();
  }, []);

  // --- SCAN LOGIC ---
  const fetchScan = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // Pass risk level to backend
      const res = await axios.get<ApiResponse>(`/api/scan?risk=${riskLevel}`);
      
      if (res.data.status === 'success' || res.data.status === 'cached') {
        setResults(res.data.results);
        setLastUpdated(res.data.timestamp);
        setSystemStatus('ONLINE');
        if (res.data.results.length === 0) {
            setErrorMsg("No setups found. Try increasing Risk Level.");
        }
      } else {
        setResults([]);
        setErrorMsg("Market data unavailable.");
        setSystemStatus('OFFLINE');
      }
    } catch (err) {
      console.error(err);
      setResults([]);
      setErrorMsg("Connection Error.");
      setSystemStatus('OFFLINE');
    } finally {
      setLoading(false);
    }
  }, [riskLevel]);

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
            setSystemStatus('ONLINE'); // Successful search proves system is online
        } else {
            setSearchError(res.data.message || 'Stock not found');
        }
    } catch (err: any) {
        setSearchError(err.response?.data?.message || 'Failed to fetch stock data. Try valid symbol (e.g., INFY).');
        // Search failure for one stock doesn't mean system is offline, so we don't set OFFLINE here
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
    <div className="min-h-screen bg-gray-900 text-white font-sans pb-20">
      
      {/* SYSTEM STATUS BAR */}
      <div className={`w-full py-1.5 px-4 text-[10px] font-bold tracking-wider flex items-center justify-center gap-2 ${
          systemStatus === 'ONLINE' ? 'bg-emerald-900/50 text-emerald-400 border-b border-emerald-900' : 
          systemStatus === 'OFFLINE' ? 'bg-red-900/50 text-red-400 border-b border-red-900' : 'bg-gray-800 text-gray-400'
      }`}>
          {systemStatus === 'ONLINE' ? <Wifi className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
          {systemStatus === 'ONLINE' ? 'DATA FEED: ACTIVE (NSE/YAHOO)' : 
           systemStatus === 'OFFLINE' ? 'DATA FEED: DISRUPTED' : 'CONNECTING TO FEEDS...'}
      </div>

      <div className="p-4">
        {/* HEADER */}
        <header className="mb-6 flex flex-col items-center pt-2">
            <h1 className="text-3xl font-bold text-emerald-400 tracking-wider mb-2">INTRADAY HAWK</h1>
            <p className="text-xs text-gray-500 text-center max-w-md">
            Real-time Intraday Screener.<br/>
            Select your risk appetite below.
            </p>
        </header>

        {/* SEARCH BAR */}
        <div className="max-w-md mx-auto mb-6 relative z-50">
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

        {/* RISK CONTROLS */}
        <div className="max-w-md mx-auto mb-6 flex justify-center bg-gray-800 p-1 rounded-full border border-gray-700">
            <button 
                onClick={() => setRiskLevel('LOW')}
                className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-full text-xs font-bold transition-all ${riskLevel === 'LOW' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
                <ShieldCheck className="w-3 h-3" /> LOW RISK
            </button>
            <button 
                onClick={() => setRiskLevel('MEDIUM')}
                className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-full text-xs font-bold transition-all ${riskLevel === 'MEDIUM' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
                <Shield className="w-3 h-3" /> MEDIUM
            </button>
            <button 
                onClick={() => setRiskLevel('HIGH')}
                className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-full text-xs font-bold transition-all ${riskLevel === 'HIGH' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
                <ShieldAlert className="w-3 h-3" /> HIGH RISK
            </button>
        </div>

        {/* SCREENER BUTTON */}
        <div className="flex flex-col items-center mb-8 gap-4 sticky top-4 z-40">
            <button
            onClick={fetchScan}
            disabled={loading}
            className={`px-8 py-3 rounded-full font-bold shadow-lg transition-all transform active:scale-95 ${
                loading 
                ? 'bg-gray-700 cursor-not-allowed text-gray-400' 
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white'
            }`}
            >
            {loading ? 'ANALYZING MARKET...' : `SCAN (${riskLevel} RISK)`}
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
            <div className="p-6 border border-gray-700 bg-gray-800/50 rounded-lg text-center">
                <h3 className="text-xl font-bold text-gray-300 mb-2">{errorMsg}</h3>
                <p className="text-sm text-gray-500">
                    {riskLevel === 'LOW' ? 'Low risk rules are very strict.' : 'Market is currently choppy or offline.'}
                </p>
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
                <p>Hit "SCAN" to find opportunities.</p>
                </div>
            )
            )}
        </main>

        {/* FOOTER */}
        <footer className="mt-12 pt-8 border-t border-gray-800 text-center text-gray-600 text-[10px] space-y-2">
            <p>
            DATA DELAY WARNING: Prices are near-real-time (10-60s delay) via Yahoo Finance.
            NSE real-time checks are best-effort.
            </p>
            <p className="max-w-2xl mx-auto">
            DISCLAIMER: This tool is for educational purposes only. 
            No financial advice provided. Trading carries significant risk.
            </p>
        </footer>
      </div>
    </div>
  );
};

export default App;