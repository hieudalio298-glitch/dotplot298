import { createClient } from "@supabase/supabase-js";
import { HeatmapClient } from "./heatmap-client";

export const metadata = {
    title: "Heatmap — VNStock Live",
    description: "Bản đồ thị trường chứng khoán Việt Nam theo ngành ICB",
};

// Enable ISR-like caching: revalidate every 30s so subsequent navigations hit cache
export const revalidate = 30;

export default async function HeatmapPage() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(url, key);

    // Batch-fetch all rows (Supabase limits to 1000 per request)
    async function fetchAll(table: string) {
        let allData: any[] = [];
        let from = 0;
        while (true) {
            const { data, error } = await supabase
                .from(table)
                .select("*")
                .range(from, from + 999);
            if (error || !data || data.length === 0) break;
            allData = [...allData, ...data];
            if (data.length < 1000) break;
            from += 1000;
        }
        return allData;
    }

    // Fetch both tables in parallel for speed
    const [stocksData, pricesData] = await Promise.all([
        fetchAll("stocks"),
        fetchAll("latest_prices"),
    ]);

    return (
        <HeatmapClient
            initialStocks={stocksData}
            initialPrices={pricesData}
        />
    );
}
