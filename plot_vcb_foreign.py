import sys
import pandas as pd
import plotly.graph_objects as go
from datetime import datetime, timedelta

try:
    from vnstock import Vnstock
except ImportError:
    print("Vui lòng cài đặt vnstock: pip install vnstock")
    sys.exit(1)

def get_foreign_data(symbol, start, end):
    # Các nguồn dữ liệu của vnstock có thể chứa data khối ngoại
    sources = ['TCBS', 'SSI', 'VCI', 'KBS', 'VND']
    for src in sources:
        try:
            print(f"Đang thử lấy dữ liệu từ {src}...")
            stock = Vnstock().stock(symbol=symbol, source=src)
            df = stock.quote.history(start=start, end=end)
            if df is not None and not df.empty:
                # Tìm cột chứa dữ liệu NĐTNN (foreign)
                col_buy = next((c for c in df.columns if 'foreignBuy' in c or 'foreign_buy' in c), None)
                col_sell = next((c for c in df.columns if 'foreignSell' in c or 'foreign_sell' in c), None)

                if col_buy and col_sell:
                    df['Net_Foreign_Volume'] = df[col_buy] - df[col_sell]
                    return df, src
                
                # TCBS V2 format
                col_net = next((c for c in df.columns if 'buyForeignQuantity' in c), None)
                col_sell_q = next((c for c in df.columns if 'sellForeignQuantity' in c), None)
                if col_net and col_sell_q:
                    df['Net_Foreign_Volume'] = df[col_net] - df[col_sell_q]
                    return df, src
                    
        except Exception as e:
            pass
    return None, None

def main():
    symbol = 'VCB'
    # Lấy dữ liệu 6 tháng gần nhất
    end_date = datetime.now().strftime('%Y-%m-%d')
    start_date = (datetime.now() - timedelta(days=180)).strftime('%Y-%m-%d')
    
    print(f"=== TẢI DỮ LIỆU GIAO DỊCH KHỐI NGOẠI {symbol} ===")
    df, src = get_foreign_data(symbol, start_date, end_date)

    if df is not None:
        print(f"\n[OK] Đã lấy thành công dữ liệu từ nguồn {src}. Đang vẽ biểu đồ...")
        
        # Sắp xếp thời gian
        time_col = 'time' if 'time' in df.columns else 'tradingDate' if 'tradingDate' in df.columns else df.index
        
        # Tạo mảng màu đỏ cho bán ròng, xanh lá cho mua ròng
        colors = ['#2ECC71' if val > 0 else '#E74C3C' for val in df['Net_Foreign_Volume']]
        
        fig = go.Figure()
        
        # Biểu đồ cột: Mua/bán ròng (Net Foreign Volume)
        fig.add_trace(go.Bar(
            x=df[time_col],
            y=df['Net_Foreign_Volume'],
            name='Mua/Bán ròng NĐTNN (Vol)',
            marker_color=colors,
            yaxis='y1'
        ))
        
        # Đường thẳng: Giá cổ phiếu
        price_col = next((c for c in df.columns if 'close' in c.lower() or 'price' in c.lower()), None)
        if price_col:
            fig.add_trace(go.Scatter(
                x=df[time_col],
                y=df[price_col],
                name='Giá đóng cửa (VND)',
                yaxis='y2',
                mode='lines',
                line=dict(color='#F39C12', width=2.5)
            ))
            
        fig.update_layout(
            title=f"<b>Khối ngoại giao dịch mã cổ phiếu {symbol}</b> ({start_date} -> {end_date})",
            template='plotly_dark',
            plot_bgcolor='rgb(10, 10, 15)',
            paper_bgcolor='rgb(10, 10, 15)',
            yaxis=dict(
                title='Khối lượng Mua ròng / Bán ròng',
                showgrid=False,
                zeroline=True,
                zerolinecolor='rgba(255,255,255,0.2)',
                zerolinewidth=2
            ),
            yaxis2=dict(
                title='Giá cổ phiếu',
                overlaying='y',
                side='right',
                showgrid=True,
                gridcolor='rgba(255,255,255,0.05)'
            ),
            xaxis=dict(
                title='Thời gian',
                showgrid=False
            ),
            hovermode='x unified',
            legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
        )
        
        output_html = f"vcb_foreign_chart.html"
        fig.write_html(output_html)
        print(f"[DONE] Đã lưu biểu đồ thành công: {output_html}")
        # Tự động mở file
        import webbrowser
        import os
        webbrowser.open('file://' + os.path.realpath(output_html))
    else:
        print("\n[LỖI] Không tìm thấy dữ liệu khối ngoại cho VCB từ bất kỳ nguồn hỗ trợ nào.")

if __name__ == '__main__':
    main()
