from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import subprocess
import logging
from update_financials import FinancialFetcher, SUPABASE_URL, SUPABASE_KEY

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

if __name__ == "__main__":
    import uvicorn
    # Clean up uvicorn log config to allow custom logging if needed, 
    # but default is fine for now.
    uvicorn.run(app, host="0.0.0.0", port=8000)
