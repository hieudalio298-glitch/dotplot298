from vnstock_data import Trading
import sys

sys.stdout.reconfigure(encoding='utf-8')

def test_batch():
    symbols = ['VCB', 'VIC', 'VNM', 'HPG', 'FPT', 'MSN', 'MWG', 'SSI']
    print(f"Testing batch price_board for {symbols} via VCI...")
    try:
        t = Trading(symbol=symbols, source='VCI')
        pb = t.price_board()
        print(f"Success! Columns: {pb.columns.tolist()}")
        print(pb.head())
    except Exception as e:
        print(f"Error VCI Batch: {e}")

    print(f"\nTesting batch price_board for {symbols} via KBS...")
    try:
        t = Trading(symbol=symbols, source='KBS')
        pb = t.price_board()
        print(f"Success! Columns: {pb.columns.tolist()}")
        print(pb.head())
    except Exception as e:
        print(f"Error KBS Batch: {e}")

if __name__ == "__main__":
    test_batch()
