from vnstock_data import Trading

t = Trading(source='vci', symbol='VNM')
df = t.price_board(symbols_list=['VNM', 'TCB'], get_all=False)
print("Standard VCI Cols:", list(df.columns))
df_all = t.price_board(symbols_list=['VNM', 'TCB'], get_all=True)
print("All VCI Cols:", list(df_all.columns))
