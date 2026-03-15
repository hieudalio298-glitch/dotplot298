import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!url || !key) {
            return NextResponse.json({ error: "Missing env vars", url: !!url, key: !!key });
        }

        const supabase = createClient(url, key);

        const { data: stocks, error: stocksErr, count: stocksCount } = await supabase
            .from("stocks")
            .select("*", { count: "exact", head: true });

        const { data: prices, error: pricesErr, count: pricesCount } = await supabase
            .from("latest_prices")
            .select("*", { count: "exact", head: true });

        // Fetch a sample stock with price
        const { data: sample } = await supabase
            .from("stocks")
            .select("id, symbol, name")
            .limit(5);

        const { data: samplePrices } = await supabase
            .from("latest_prices")
            .select("stock_id, price, change, volume")
            .not("price", "is", null)
            .limit(5);

        return NextResponse.json({
            env: { url: url.substring(0, 30) + "...", keyLen: key.length },
            stocks: { count: stocksCount, error: stocksErr?.message },
            prices: { count: pricesCount, error: pricesErr?.message },
            sampleStocks: sample,
            samplePrices: samplePrices,
        });
    } catch (err) {
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
