"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Star,
    Trash2,
    TrendingUp,
    TrendingDown,
    Loader2,
    LogIn,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import type { Stock, LatestPrice } from "@/lib/types";

interface WatchlistEntry {
    id: number;
    stock_id: number;
    stock: Stock;
    latest_price: LatestPrice | null;
}

export default function WatchlistPage() {
    const [user, setUser] = useState<User | null>(null);
    const [items, setItems] = useState<WatchlistEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        const init = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            setUser(user);

            if (!user) {
                setLoading(false);
                return;
            }

            // Fetch watchlist items
            const { data: watchlistData } = await supabase
                .from("watchlists")
                .select("id, stock_id, stocks(*)")
                .eq("user_id", user.id);

            if (watchlistData) {
                // Fetch prices for watched stocks
                const stockIds = watchlistData.map((w: { stock_id: number }) => w.stock_id);
                const { data: pricesData } = await supabase
                    .from("latest_prices")
                    .select("*")
                    .in("stock_id", stockIds);

                const priceMap = new Map<number, LatestPrice>();
                pricesData?.forEach((p: LatestPrice) => priceMap.set(p.stock_id, p));

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const entries: WatchlistEntry[] = watchlistData.map((w: any) => ({
                    id: w.id,
                    stock_id: w.stock_id,
                    stock: w.stocks as Stock,
                    latest_price: priceMap.get(w.stock_id) || null,
                }));
                setItems(entries);
            }
            setLoading(false);
        };
        init();
    }, []);

    const handleRemove = async (watchlistId: number) => {
        const { error } = await supabase
            .from("watchlists")
            .delete()
            .eq("id", watchlistId);

        if (error) {
            toast.error("Không thể xóa khỏi watchlist");
            return;
        }

        setItems((prev) => prev.filter((i) => i.id !== watchlistId));
        toast.success("Đã xóa khỏi watchlist");
    };

    if (!user && !loading) {
        return (
            <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
                <Card className="max-w-md w-full p-8 text-center space-y-4 bg-card/50 backdrop-blur-xl border-border/50">
                    <Star className="h-12 w-12 mx-auto text-amber-500" />
                    <h2 className="text-xl font-bold">Watchlist cá nhân</h2>
                    <p className="text-sm text-muted-foreground">
                        Đăng nhập để theo dõi danh mục cổ phiếu yêu thích
                    </p>
                    <Link href="/auth/login">
                        <Button className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25">
                            <LogIn className="h-4 w-4 mr-2" />
                            Đăng nhập
                        </Button>
                    </Link>
                </Card>
            </div>
        );
    }

    return (
        <div className="px-4 md:px-6 py-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                    <Star className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">Watchlist</h1>
                    <p className="text-sm text-muted-foreground">
                        {items.length} cổ phiếu đang theo dõi
                    </p>
                </div>
            </div>

            {loading ? (
                <Card className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                </Card>
            ) : items.length === 0 ? (
                <Card className="flex flex-col items-center justify-center h-64 space-y-3">
                    <Star className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">
                        Chưa có cổ phiếu nào. Thêm từ bảng giá!
                    </p>
                    <Link href="/">
                        <Button variant="outline" size="sm">
                            Xem bảng giá
                        </Button>
                    </Link>
                </Card>
            ) : (
                <Card className="overflow-hidden border-border/50">
                    <ScrollArea className="max-h-[calc(100vh-200px)]">
                        <div className="divide-y divide-border/30">
                            {items.map((item) => {
                                const p = item.latest_price;
                                const change = p?.change_percent ?? 0;
                                const isUp = change > 0;
                                const isDown = change < 0;

                                return (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div>
                                                <span className="font-bold text-lg">{item.stock.symbol}</span>
                                                <p className="text-xs text-muted-foreground">
                                                    {item.stock.name || item.stock.full_name}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p
                                                    className={`font-bold font-mono ${isUp
                                                        ? "text-emerald-500"
                                                        : isDown
                                                            ? "text-red-500"
                                                            : "text-amber-500"
                                                        }`}
                                                >
                                                    {p?.price?.toLocaleString("vi-VN") || "—"}
                                                </p>
                                                <Badge
                                                    variant="outline"
                                                    className={`text-xs font-mono ${isUp
                                                        ? "text-emerald-500 border-emerald-500/30"
                                                        : isDown
                                                            ? "text-red-500 border-red-500/30"
                                                            : "text-amber-500 border-amber-500/30"
                                                        }`}
                                                >
                                                    {isUp && <TrendingUp className="h-3 w-3 mr-1" />}
                                                    {isDown && <TrendingDown className="h-3 w-3 mr-1" />}
                                                    {change > 0 ? "+" : ""}
                                                    {change.toFixed(2)}%
                                                </Badge>
                                            </div>

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                                onClick={() => handleRemove(item.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                </Card>
            )}
        </div>
    );
}
