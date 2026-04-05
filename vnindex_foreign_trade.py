import os
import pandas as pd
import plotly.graph_objects as go
from datetime import datetime
try:
    from vnstock3 import Vnstock
    vn = Vnstock()
    HAS_VNSTOCK3 = True
except:
    import vnstock as vn
    HAS_VNSTOCK3 = False
from vnstock_data import Trading
import sys
import time

# Thiết lập hiển thị tiếng Việt
sys.stdout.reconfigure(encoding='utf-8')

def get_full_market_symbols():
    """Lấy danh sách mã toàn sàn và phân loại ngành (vnstock v3.4.2)"""
    print("🔍 ĐANG TRÍCH XUẤT DANH SÁCH MÃ TOÀN SÀN & PHÂN LOẠI NGÀNH...")
    try:
        # Sử dụng Listing() để lấy toàn bộ mã chứng khoán 3 sàn
        ls = vn.Listing()
        df_all = ls.all_symbols()
        
        # v3.4.2 trả về cột 'ticker' và 'icb_name2' (tên ngành)
        tick_col = 'ticker' if 'ticker' in df_all.columns else 'symbol'
        ind_col = 'icb_name2' if 'icb_name2' in df_all.columns else 'industry'
        
        if tick_col in df_all.columns:
            # Lấy toàn bộ mã
            symbols = df_all[tick_col].tolist()
            # Map ngành (nếu có cột industry)
            if ind_col in df_all.columns:
                symbol_map = df_all.set_index(tick_col)[ind_col].to_dict()
            else:
                symbol_map = {s: 'Chứng khoán' for s in symbols}
            return symbols, symbol_map
    except Exception as e:
        print(f"⚠️ Lỗi lấy danh sách mã: {e}")
        # Dự phòng danh sách nòng cốt
        core = ['VCB','BID','CTG','TCB','MBB','HPG','VIC','VHM','VNM','MSN','FPT','GAS','MWG','STB','VPB','ACB','VIB','HDB','TPB','SHB','LPB','MSB']
        return core, {m: 'Tài chính' for m in core}
    return [], {}

def main():
    start_time = time.time()
    update_time_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    
    # 1. Lấy danh sách mã và ngành
    all_symbols, sector_map = get_full_market_symbols()
    print(f"✅ Đã tìm thấy {len(all_symbols)} mã trên tam sàn.")

    # 2. Khởi tạo VCI nạp bảng giá (Dùng mã mồi để tránh lỗi khởi tạo)
    try:
        trading = Trading(symbol='VCB', source='VCI')
    except Exception as e:
        print(f"❌ Lỗi khởi tạo VCI: {e}")
        return

    # 3. Nạp dữ liệu theo mẻ (Batching) để tránh quá tải VCI
    batch_size = 50
    results = []
    
    print(f"🚀 BẮT ĐẦU NẠP DỮ LIỆU VCI (Batch size: {batch_size})...")
    
    for i in range(0, len(all_symbols), batch_size):
        batch = all_symbols[i:i+batch_size]
        print(f"  [BATCH] Đang nạp mã {i+1} đến {min(i+batch_size, len(all_symbols))}...")
        
        try:
            df_batch = trading.price_board(symbols_list=batch, get_all=True)
            if df_batch.empty: continue
            
            for _, row in df_batch.iterrows():
                # VCI thường để mã ở Index, nên lấy row.name nếu cột 'symbol' trống
                sym = str(row.get('symbol', ''))
                if not sym or sym == 'nan':
                    sym = str(row.name) if hasattr(row, 'name') else ''
                
                # Nếu vẫn trống, bỏ qua
                if not sym: continue
                
                # CHỈ LẤY CÁC MÃ CÓ GIAO DỊCH KHỐI NGOẠI (MUA HOẶC BÁN > 0)
                buy_vol = row.get('foreign_buy_volume', 0)
                sell_vol = row.get('foreign_sell_volume', 0)
                buy_val = row.get('match_foreign_buy_value', 0)
                sell_val = row.get('match_foreign_sell_value', 0)
                
                if (buy_vol > 0 or sell_vol > 0 or buy_val > 0 or sell_val > 0):
                    price = row.get('matched_price', row.get('close', 0))
                    
                    # Tính Net (Tỷ VNĐ)
                    if buy_val > 0 or sell_val > 0:
                        net_ty = (buy_val - sell_val) / 1e9
                    else:
                        net_ty = (buy_vol - sell_vol) * price / 1000000
                    
                    results.append({
                        'symbol': sym,
                        'net_val': net_ty,
                        'abs_net': abs(net_ty),
                        'sector': sector_map.get(sym, 'Khác')
                    })
        except Exception as e:
            print(f"  ⚠️ Lỗi batch {i//batch_size + 1}: {e}")
            continue
        
        # Nghỉ ngắn giữa các mẻ nạp để tránh spam API
        time.sleep(0.3)

    if not results:
        print("❌ Không tìm thấy mã nào có giao dịch khối ngoại trong mẻ nạp này.")
        return

    df_final = pd.DataFrame(results).sort_values('abs_net', ascending=False)
    # Lấy top 100 mã có giao dịch mạnh nhất để biểu đồ không bị quá dày
    df_final = df_final.head(100)
    
    print(f"\n✅ HOÀN TẤT! Đã lọc được {len(df_final)} mã có giao dịch mạnh nhất.")
    print(f"⏱ Tổng thời gian: {time.time() - start_time:.1f}s")

    # 4. VẼ BIỂU ĐỒ BONG BÓNG DÒNG TIỀN (SIZE = ABS NET, COLOR = SECTOR)
    fig = go.Figure()

    sectors = df_final['sector'].unique()
    for sector in sectors:
        df_s = df_final[df_final['sector'] == sector]
        fig.add_trace(go.Scatter(
            x=df_s['symbol'],
            y=df_s['net_val'],
            mode='markers+text',
            name=sector,
            text=df_s['symbol'],
            textposition='top center',
            marker=dict(
                size=df_s['abs_net'].clip(15, 100), # Size tỉ lệ với giá trị giao dịch ròng
                sizemode='area',
                sizeref=2.*max(df_final['abs_net'])/(60.**2), # Chuẩn hóa kích thước
                sizemin=10,
                opacity=0.8,
                line=dict(width=1, color='white')
            ),
            hovertemplate="<b>%{text}</b><br>Ngành: " + sector + "<br>Net: %{y:+.2f} Tỷ<extra></extra>"
        ))

    fig.update_layout(
        template='plotly_dark',
        plot_bgcolor='black', paper_bgcolor='black',
        title=dict(text=f"<b>DÒNG TIỀN KHỐI NGOẠI THEO GIÁ TRỊ GIAO DỊCH (PHIÊN {update_time_str})</b>", x=0.5),
        yaxis_title="Giá trị ròng (Tỷ VNĐ)",
        xaxis_title="Mã Chứng Khoán (Phân màu theo Ngành)",
        height=750,
        showlegend=True
    )
    
    fig.show()

if __name__ == "__main__":
    main()
