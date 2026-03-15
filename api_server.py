from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import subprocess
import logging
from update_financials import FinancialFetcher, SUPABASE_URL, SUPABASE_KEY
from pydantic import BaseModel
from typing import List

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Allow CORS for all origins (or restrict to your specific domains)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow requests from localhost:3004 and deployed web
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Financial Data Updater API is running"}

@app.post("/update/{symbol}")
async def update_stock_data(symbol: str):
    logger.info(f"Received update request for symbol: {symbol}")
    symbol = symbol.upper()
    
    try:
        # Initialize the fetcher
        fetcher = FinancialFetcher(SUPABASE_URL, SUPABASE_KEY)
        
        # Process the symbol specifically
        # Using process_symbol_safely directly
        success = fetcher.process_symbol_safely(symbol)
        
        if success:
            logger.info(f"Successfully updated/fetched data for {symbol}")
            return {"status": "success", "message": f"Data for {symbol} updated successfully."}
        else:
            logger.error(f"Failed to update data for {symbol}")
            raise HTTPException(status_code=500, detail=f"Failed to update data for {symbol}. Check server logs.")
            
    except Exception as e:
        logger.error(f"Exception during update: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history")
async def get_history(symbol: str, start: str, end: str):
    logger.info(f"API history requested for {symbol} from {start} to {end}")
    try:
        from vnstock_data import Quote
        # For vnstock_data, source='VCI' is premium
        q = Quote(source="VCI", symbol=symbol)
        df = q.history(start=start, end=end, interval="1D")
        
        if df is None or df.empty:
            return []
            
        # Convert date column to string and ensure names match what frontend expects
        if "time" in df.columns:
            df["date"] = df["time"].astype(str)
        elif "date" in df.columns:
            df["date"] = df["date"].astype(str)
            
        # Select and rename columns correctly
        # Usually: time, open, high, low, close, volume
        # Or: date, open, high, low, close, volume
        records = df.to_dict(orient="records")
        return records
        
    except Exception as e:
        logger.error(f"Error fetching history for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class SharesRequest(BaseModel):
    symbols: List[str]

@app.post("/api/shares")
async def get_shares(req: SharesRequest):
    logger.info(f"API shares requested for {req.symbols}")
    try:
        from vnstock_data import Company
        result = {}
        for sym in req.symbols:
            try:
                # Use Company overview to get shares
                cp = Company(source="VCI", symbol=sym)
                df = cp.overview()
                if df is not None and not df.empty:
                    val = 0
                    if "issue_share" in df.columns:
                        val = df.iloc[0]["issue_share"]
                    elif "outstanding_share" in df.columns:
                        val = df.iloc[0]["outstanding_share"]
                    elif "financial_ratio_issue_share" in df.columns:
                        val = df.iloc[0]["financial_ratio_issue_share"]
                    
                    if val > 0:
                        result[sym] = float(val)
            except Exception as e:
                logger.error(f"Error fetching shares for {sym}: {e}")
                pass
        return result
    except Exception as e:
        logger.error(f"Error fetching shares: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Clean up uvicorn log config to allow custom logging if needed, 
    # but default is fine for now.
    uvicorn.run(app, host="0.0.0.0", port=8000)
