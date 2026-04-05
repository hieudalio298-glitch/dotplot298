try:
    from vnstock_data import Listing, Company, Trading
    import pandas as pd
    import sys

    # Fix encoding for Windows terminal
    sys.stdout.reconfigure(encoding='utf-8')

    def explore():
        print("--- vnstock_data.Listing(source='vnd') ---")
        try:
            l = Listing(source='vnd')
            all_syms = l.all_symbols()
            print(f"Columns: {all_syms.columns.tolist()}")
            # Filter for HOSE if possible
            if 'exchange' in all_syms.columns:
                hose = all_syms[all_syms['exchange'] == 'HOSE']
                print(f"HOSE count: {len(hose)}")
            print(all_syms.head())
        except Exception as e:
            print(f"Error Listing: {e}")

        print("\n--- vnstock_data.Company(symbol='VCB', source='VCI').overview() ---")
        try:
            cp = Company(symbol='VCB', source='VCI')
            ov = cp.overview()
            print(f"Overview Columns: {ov.columns.tolist()}")
            print(ov.iloc[0] if not ov.empty else "Empty")
        except Exception as e:
            print(f"Error Company: {e}")

        print("\n--- vnstock_data.Trading(symbol='VCB', source='VCI').price_board() ---")
        try:
            # Note: in some versions Trading takes symbol or symbols
            t = Trading(symbol='VCB', source='VCI')
            pb = t.price_board()
            print(f"Price Board Columns: {pb.columns.tolist()}")
            print(pb)
        except Exception as e:
            print(f"Error Trading: {e}")

    if __name__ == "__main__":
        explore()
except ImportError:
    print("vnstock_data not found.")
