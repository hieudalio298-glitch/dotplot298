# VNStock Live 🚀

Bảng giá chứng khoán Việt Nam thời gian thực sử dụng Next.js 15, Supabase, và vnstock_data.

![Tech Stack](https://img.shields.io/badge/Next.js_15-black?logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)

## ✨ Tính năng

- **Bảng giá realtime** — HOSE, HNX, UPCOM cập nhật qua Supabase Realtime
- **Tìm kiếm & lọc** — Theo sàn, theo mã/tên công ty
- **Chi tiết cổ phiếu** — Biểu đồ giá 1D/5D/1M, OHLC, thông tin ngành
- **Watchlist** — Theo dõi cá nhân (yêu cầu đăng nhập)
- **Dark mode** — Giao diện tối mặc định, có thể chuyển sáng
- **Responsive** — Tối ưu mobile
- **Xác thực** — Email + Google OAuth (Supabase Auth)

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| UI | shadcn/ui, lucide-react |
| Charts | Recharts |
| Backend | Supabase (PostgreSQL + Realtime + Auth + RLS) |
| Data Feed | vnstock_data (sponsor) + Python worker |
| Deploy | Vercel (frontend) + Railway/Render (worker) |

## 🚀 Setup

### 1. Clone & Install

```bash
cd vnstock-live
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

### 3. Run Dev Server

```bash
npm run dev
```

Mở `http://localhost:3000`

### 4. Run Data Worker

```bash
cd worker
pip install -r requirements.txt
# Install vnstock_data sponsor
python ../install_vnstock_data.py

# Test run (fetch 50 symbols once)
python stock_updater.py --once --force

# Production (continuous, trading hours only)
python stock_updater.py
```

## 📁 Cấu trúc dự án

```
vnstock-live/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout + ThemeProvider
│   │   ├── page.tsx            # Dashboard chính
│   │   ├── auth/
│   │   │   ├── login/page.tsx  # Đăng nhập
│   │   │   └── callback/route.ts
│   │   └── watchlist/page.tsx  # Watchlist cá nhân
│   ├── components/
│   │   ├── navbar.tsx
│   │   ├── stock-table.tsx     # Bảng giá realtime
│   │   ├── stock-filters.tsx   # Tìm kiếm + lọc
│   │   ├── stock-detail-modal.tsx
│   │   ├── price-chart.tsx     # Biểu đồ Recharts
│   │   ├── theme-provider.tsx
│   │   └── ui/                 # shadcn components
│   └── lib/
│       ├── supabase/
│       │   ├── client.ts       # Browser client
│       │   └── server.ts       # Server client
│       ├── types.ts
│       └── utils.ts
├── worker/
│   ├── stock_updater.py        # Python data worker
│   └── requirements.txt
├── .env.example
└── README.md
```

## 🗄️ Database Schema

- **stocks** — Danh sách mã CK (symbol, name, exchange, sector)
- **latest_prices** — Giá mới nhất (OHLC, volume, change) — UNIQUE on stock_id
- **price_history** — Lịch sử giá (cho biểu đồ)
- **watchlists** — Danh mục cá nhân (yêu cầu auth)

RLS: Public read cho prices, authenticated write cho watchlist.

## 🌐 Deploy

### Vercel (Frontend)
1. Push code lên GitHub
2. Import repo vào Vercel
3. Set env variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

### Railway/Render (Worker)
1. Tạo Python service
2. Set env: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
3. Start command: `python worker/stock_updater.py`
