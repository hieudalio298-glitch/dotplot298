import { createClient } from "@supabase/supabase-js";
import { HomeClient } from "./home-client";

export default async function Home() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(url, key);

  // Helper to fetch all rows in batches
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

  const stocksData = await fetchAll("stocks");
  const pricesData = await fetchAll("latest_prices");

  const uniqueSectors = Array.from(new Set(stocksData.map(s => s.sector).filter(Boolean))).sort();

  return (
    <HomeClient
      initialStocks={stocksData ?? []}
      initialPrices={pricesData ?? []}
      sectors={uniqueSectors}
    />
  );
}
