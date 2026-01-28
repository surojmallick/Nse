from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import yfinance as yf
import pandas as pd
import pandas_ta as ta
import numpy as np
import os
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CONFIGURATION ---
SYMBOLS = [
    'RELIANCE.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'INFY.NS', 'TCS.NS',
    'ITC.NS', 'KOTAKBANK.NS', 'LT.NS', 'SBIN.NS', 'BHARTIARTL.NS',
    'AXISBANK.NS', 'ASIANPAINT.NS', 'MARUTI.NS', 'TITAN.NS', 'BAJFINANCE.NS',
    'TATASTEEL.NS', 'M&M.NS', 'SUNPHARMA.NS', 'HCLTECH.NS', 'ULTRACEMCO.NS'
]

# --- HELPER FUNCTIONS ---

def calculate_indicators(df):
    """Calculates EMA, RSI, ATR using pandas_ta"""
    try:
        # EMAs
        df['EMA_9'] = ta.ema(df['Close'], length=9)
        df['EMA_21'] = ta.ema(df['Close'], length=21)
        df['EMA_50'] = ta.ema(df['Close'], length=50)
        
        # RSI
        df['RSI'] = ta.rsi(df['Close'], length=14)
        
        # ATR
        df['ATR'] = ta.atr(df['High'], df['Low'], df['Close'], length=14)
        
        # Average Volume (20 period)
        df['Avg_Vol'] = df['Volume'].rolling(window=20).mean()
        
        return df
    except Exception as e:
        print(f"Indicator Error: {e}")
        return df

def analyze_stock(symbol, risk_level):
    try:
        # Download last 5 days of 5m data
        ticker = yf.Ticker(symbol)
        df = ticker.history(period="5d", interval="5m")
        
        if df.empty or len(df) < 55:
            return None
            
        # Clean Data
        df = calculate_indicators(df)
        
        # Get latest completed candle
        current = df.iloc[-1]
        
        # Extract values
        price = current['Close']
        ema9 = current['EMA_9']
        ema21 = current['EMA_21']
        ema50 = current['EMA_50']
        rsi = current['RSI']
        atr = current['ATR'] if not np.isnan(current['ATR']) else price * 0.01
        vol = current['Volume']
        avg_vol = current['Avg_Vol']
        
        if np.isnan(rsi) or np.isnan(ema50):
            return None

        # Logic
        valid = False
        reason = ""
        
        is_uptrend = ema9 > ema21
        strong_uptrend = is_uptrend and (ema21 > ema50)
        is_rsi_bullish = rsi > 50
        is_rsi_strong = 60 < rsi < 80
        is_vol_high = vol > avg_vol

        if risk_level == 'HIGH':
            if is_uptrend or is_rsi_bullish:
                valid = True
                reason = "Trend Following" if is_uptrend else "Momentum Play"
        elif risk_level == 'MEDIUM':
            if is_uptrend and (is_rsi_bullish or is_vol_high):
                valid = True
                reason = "Trend + Momentum"
        elif risk_level == 'LOW':
            if strong_uptrend and is_rsi_strong and is_vol_high:
                valid = True
                reason = "High Conviction Setup"

        if valid:
            # Risk Management
            atr_multiplier = 1.5 if risk_level == 'HIGH' else (1.0 if risk_level == 'MEDIUM' else 0.8)
            sl_dist = atr * atr_multiplier
            
            stop_loss = price - sl_dist
            reward_ratio = 2 if risk_level == 'HIGH' else 1.5
            target = price + (sl_dist * reward_ratio)
            
            # Confidence Score
            confidence = rsi
            if is_uptrend: confidence += 10
            if strong_uptrend: confidence += 10
            if is_vol_high: confidence += 10

            return {
                "stock": symbol.replace('.NS', ''),
                "direction": "BUY",
                "price": f"{price:.2f}",
                "entryRange": f"{(price * 0.999):.2f} - {(price * 1.001):.2f}",
                "stopLoss": f"{stop_loss:.2f}",
                "target": f"{target:.2f}",
                "confidenceScore": f"{min(99, confidence):.0f}",
                "reason": f"{reason} | RSI: {rsi:.0f}",
                "timestamp": datetime.now().isoformat()
            }
            
    except Exception as e:
        print(f"Error processing {symbol}: {e}")
        return None
    return None

# --- ROUTES ---

@app.get("/api/health")
def health_check():
    return {"status": "ok", "backend": "FastAPI + yfinance"}

@app.get("/api/scan")
def scan_stocks(risk: str = "MEDIUM"):
    results = []
    
    # Use ThreadPool to scan symbols in parallel (much faster)
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(analyze_stock, sym, risk) for sym in SYMBOLS]
        for future in futures:
            res = future.result()
            if res:
                results.append(res)
    
    results.sort(key=lambda x: float(x['confidenceScore']), reverse=True)
    
    return {
        "status": "success",
        "results": results,
        "timestamp": datetime.now().timestamp() * 1000
    }

@app.get("/api/stock/{symbol}")
def get_stock_details(symbol: str):
    try:
        clean_symbol = symbol.upper()
        if not clean_symbol.endswith('.NS'):
            clean_symbol += '.NS'
            
        ticker = yf.Ticker(clean_symbol)
        
        # Get Intraday Data (5 days, 5m interval)
        hist = ticker.history(period="5d", interval="5m")
        
        if hist.empty:
            raise HTTPException(status_code=404, detail="Stock data not found")
            
        # Get Quote Data (Fastest way in yfinance)
        # Note: .info is sometimes slow, using history for price is faster/safer
        current_price = hist['Close'].iloc[-1]
        prev_close = hist['Close'].iloc[-2] if len(hist) > 1 else current_price
        
        # Format chart data
        # We only take the last trading day for the chart display
        last_date = hist.index[-1].date()
        todays_data = hist[hist.index.date == last_date]
        
        chart_data = []
        for index, row in todays_data.iterrows():
            chart_data.append({
                "time": int(index.timestamp() * 1000),
                "price": row['Close']
            })
            
        change = current_price - prev_close
        change_p = (change / prev_close) * 100
        
        return {
            "status": "success",
            "data": {
                "symbol": clean_symbol.replace('.NS', ''),
                "ltp": current_price,
                "change": f"{change:.2f}",
                "changePercent": f"{change_p:.2f}",
                "prevClose": prev_close,
                "source": "yfinance (Python)",
                "chart": chart_data
            }
        }
        
    except Exception as e:
        print(f"Detail error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Mount React App (After API routes)
# Check if 'dist' exists (Production)
if os.path.exists("dist"):
    app.mount("/", StaticFiles(directory="dist", html=True), name="static")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 3000)), reload=True)
