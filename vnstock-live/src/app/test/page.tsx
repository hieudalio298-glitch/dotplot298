import { createClient } from "@supabase/supabase-js";

export default async function TestPage() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(url, key);

    const { data: stocks, error: stocksErr } = await supabase
        .from("stocks")
        .select("id, symbol, name, exchange")
        .order("symbol")
        .limit(20);

    const { data: prices, error: pricesErr } = await supabase
        .from("latest_prices")
        .select("stock_id, price, change, change_percent, volume")
        .not("price", "is", null)
        .order("volume", { ascending: false })
        .limit(20);

    const priceMap = new Map<number, typeof prices extends (infer T)[] | null ? T : never>();
    prices?.forEach((p) => priceMap.set(p.stock_id, p));

    return (
        <div style={{ padding: 20, fontFamily: "monospace", color: "#fff", background: "#111" }}>
            <h1 style={{ color: "#4ade80" }}>🧪 Test Page — Server Rendered</h1>
            <p>Stocks: {stocks?.length ?? "error"} | Prices: {prices?.length ?? "error"}</p>
            {stocksErr && <p style={{ color: "red" }}>Stocks error: {stocksErr.message}</p>}
            {pricesErr && <p style={{ color: "red" }}>Prices error: {pricesErr.message}</p>}

            <h2 style={{ marginTop: 20 }}>Top Stocks by Volume:</h2>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead>
                    <tr style={{ borderBottom: "1px solid #333" }}>
                        <th style={{ padding: 8, textAlign: "left" }}>Symbol</th>
                        <th style={{ padding: 8, textAlign: "left" }}>Exchange</th>
                        <th style={{ padding: 8, textAlign: "right" }}>Price</th>
                        <th style={{ padding: 8, textAlign: "right" }}>Change</th>
                        <th style={{ padding: 8, textAlign: "right" }}>Volume</th>
                    </tr>
                </thead>
                <tbody>
                    {prices?.map((p, i) => {
                        const stock = stocks?.find((s) => s.id === p.stock_id);
                        return (
                            <tr key={i} style={{ borderBottom: "1px solid #222" }}>
                                <td style={{ padding: 8, fontWeight: "bold" }}>{stock?.symbol ?? `ID:${p.stock_id}`}</td>
                                <td style={{ padding: 8 }}>{stock?.exchange ?? "—"}</td>
                                <td style={{ padding: 8, textAlign: "right", color: (p.change ?? 0) > 0 ? "#4ade80" : (p.change ?? 0) < 0 ? "#f87171" : "#fbbf24" }}>
                                    {p.price?.toLocaleString() ?? "—"}
                                </td>
                                <td style={{ padding: 8, textAlign: "right", color: (p.change ?? 0) > 0 ? "#4ade80" : (p.change ?? 0) < 0 ? "#f87171" : "#fbbf24" }}>
                                    {p.change_percent != null ? `${p.change_percent > 0 ? "+" : ""}${Number(p.change_percent).toFixed(2)}%` : "—"}
                                </td>
                                <td style={{ padding: 8, textAlign: "right" }}>{p.volume?.toLocaleString() ?? "—"}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
