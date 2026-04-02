"""Test script for vnstock_data (Premium) structure."""
import os
try:
    from vnstock_data import Trading
    t = Trading()
    board = t.price_board(['VCB', 'VNM'])
    
    # Check column types
    is_tuple = isinstance(board.columns[0], tuple)
    print(f"Is MultiIndex: {is_tuple}")
    
    if is_tuple:
        # Flatten
        board.columns = ['_'.join(col).strip() for col in board.columns.values]
    
    print("\nColumns (first 30):")
    print(board.columns.tolist()[:30])
    
    print("\nData Sample:")
    print(board.head(1).to_dict('records'))

except Exception as e:
    print(f"Error: {e}")
