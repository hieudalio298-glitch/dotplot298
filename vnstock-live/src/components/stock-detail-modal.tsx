"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Building2, BarChart3, Activity } from "lucide-react";
import { PriceChart } from "./price-chart";
import type { StockWithPrice, PriceHistory } from "@/lib/types";

interface StockDetailModalProps {
    stock: StockWithPrice | null;
    open: boolean;
    onClose: () => void;
}

export function StockDetailModal({ stock, open, onClose }: StockDetailModalProps) {
    const [history, setHistory] = useState<PriceHistory[]>([]);
    const [period, setPeriod] = useState("1D");
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        if (!stock || !open) return;

        const fetchHistory = async () => {
            setLoading(true);
            try {
                // If latest_price is missing, fetch it as fallback
                if (!stock.latest_price) {
                    const { data: lpData } = await supabase
                        .from("latest_prices")
                        .select("*")
                        .eq("stock_id", stock.id)
                        .single();
                    if (lpData) {
                        stock.latest_price = lpData;
                    }
                }

                const now = new Date();
                let startDate = new Date();

                switch (period) {
                    case "1D":
                        startDate.setDate(now.getDate() - 1);
                        break;
                    case "5D":
                        startDate.setDate(now.getDate() - 5);
                        break;
                    case "1M":
                        startDate.setMonth(now.getMonth() - 1);
                        break;
                }

                const { data } = await supabase
                    .from("price_history")
                    .select("*")
                    .eq("stock_id", stock.id)
                    .gte("timestamp", startDate.toISOString())
                    .order("timestamp", { ascending: true });

                setHistory(data || []);
            } catch (err) {
                console.error("Failed to fetch price history:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [stock, period, open]);

    if (!stock) return null;

    const p = stock.latest_price;
    const change = p?.change ?? 0;
    const changePercent = p?.change_percent ?? 0;
    const isUp = change > 0;
    const isDown = change < 0;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20">
                            <BarChart3 className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xl font-bold">{stock.symbol}</span>
                                <Badge variant="outline" className="text-xs">
                                    {stock.exchange || "—"}
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground font-normal">
                                {stock.name || stock.full_name || ""}
                            </p>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                {/* Price overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    <Card className="p-3 bg-gradient-to-br from-background to-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">Giá hiện tại</p>
                        <p
                            className={`text-2xl font-bold font-mono ${isUp ? "text-emerald-500" : isDown ? "text-red-500" : "text-amber-500"
                                }`}
                        >
                            {p?.price?.toLocaleString("vi-VN") || "—"}
                        </p>
                    </Card>
                    <Card className="p-3">
                        <p className="text-xs text-muted-foreground mb-1">Thay đổi</p>
                        <div className="flex items-center gap-1.5">
                            {isUp && <TrendingUp className="h-4 w-4 text-emerald-500" />}
                            {isDown && <TrendingDown className="h-4 w-4 text-red-500" />}
                            <span
                                className={`text-lg font-bold font-mono ${isUp ? "text-emerald-500" : isDown ? "text-red-500" : "text-amber-500"
                                    }`}
                            >
                                {isUp ? "+" : ""}
                                {changePercent?.toFixed(2)}%
                            </span>
                        </div>
                    </Card>
                    <Card className="p-3">
                        <p className="text-xs text-muted-foreground mb-1">Khối lượng</p>
                        <p className="text-lg font-bold font-mono">
                            {p?.volume ? (p.volume / 1000).toFixed(0) + "K" : "—"}
                        </p>
                    </Card>
                    <Card className="p-3">
                        <p className="text-xs text-muted-foreground mb-1">Tham chiếu</p>
                        <p className="text-lg font-bold font-mono text-amber-500">
                            {p?.ref_price?.toLocaleString("vi-VN") || "—"}
                        </p>
                    </Card>
                </div>

                {/* OHLC row */}
                <div className="grid grid-cols-4 gap-2 mt-2">
                    {[
                        { label: "Mở cửa", value: p?.open },
                        { label: "Cao nhất", value: p?.high, color: "text-emerald-500" },
                        { label: "Thấp nhất", value: p?.low, color: "text-red-500" },
                        { label: "Đóng cửa", value: p?.close },
                    ].map((item) => (
                        <div key={item.label} className="text-center p-2 rounded-lg bg-muted/30">
                            <p className="text-[10px] text-muted-foreground">{item.label}</p>
                            <p className={`font-mono text-sm font-semibold ${item.color || ""}`}>
                                {item.value?.toLocaleString("vi-VN") || "—"}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Chart */}
                <div className="mt-4">
                    <Tabs value={period} onValueChange={setPeriod}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-emerald-500" />
                                <span className="text-sm font-semibold">Biểu đồ giá</span>
                            </div>
                            <TabsList className="h-8">
                                <TabsTrigger value="1D" className="text-xs h-6 px-3">
                                    1D
                                </TabsTrigger>
                                <TabsTrigger value="5D" className="text-xs h-6 px-3">
                                    5D
                                </TabsTrigger>
                                <TabsTrigger value="1M" className="text-xs h-6 px-3">
                                    1M
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value={period} className="mt-0">
                            <PriceChart data={history} loading={loading} refPrice={p?.ref_price ?? null} />
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Info */}
                {stock.sector && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        <span>Ngành: <span className="text-foreground font-medium">{stock.sector}</span></span>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
