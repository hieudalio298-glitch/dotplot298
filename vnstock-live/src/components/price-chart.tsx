"use client";

import {
    ResponsiveContainer,
    ComposedChart,
    Area,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ReferenceLine,
    Bar,
} from "recharts";
import { Loader2 } from "lucide-react";
import type { PriceHistory } from "@/lib/types";

interface PriceChartProps {
    data: PriceHistory[];
    loading: boolean;
    refPrice: number | null;
}

export function PriceChart({ data, loading, refPrice }: PriceChartProps) {
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 rounded-lg bg-muted/30">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground">
                    Chưa có dữ liệu lịch sử cho khoảng thời gian này.
                </p>
            </div>
        );
    }

    const chartData = data.map((d) => ({
        time: new Date(d.timestamp).toLocaleString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
        }),
        price: d.close ?? d.price ?? 0,
        open: d.open ?? 0,
        high: d.high ?? 0,
        low: d.low ?? 0,
        volume: d.volume ?? 0,
    }));

    const prices = chartData.map((d) => d.price).filter(Boolean);
    const minPrice = Math.min(...prices) * 0.998;
    const maxPrice = Math.max(...prices) * 1.002;

    const lastPrice = prices[prices.length - 1];
    const firstPrice = prices[0];
    const isUp = lastPrice >= firstPrice;
    const lineColor = isUp ? "#10b981" : "#ef4444";
    const gradientId = isUp ? "priceGradientUp" : "priceGradientDown";

    return (
        <div className="rounded-lg bg-muted/20 p-3">
            <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                    <defs>
                        <linearGradient id="priceGradientUp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="priceGradientDown" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                    </defs>

                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                        opacity={0.3}
                    />

                    <XAxis
                        dataKey="time"
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                    />

                    <YAxis
                        domain={[minPrice, maxPrice]}
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v: number) => v.toLocaleString("vi-VN")}
                    />

                    {refPrice && (
                        <ReferenceLine
                            y={refPrice}
                            stroke="#f59e0b"
                            strokeDasharray="4 4"
                            strokeWidth={1}
                            label={{
                                value: "TC",
                                position: "right",
                                fill: "#f59e0b",
                                fontSize: 10,
                            }}
                        />
                    )}

                    <Area
                        type="monotone"
                        dataKey="price"
                        stroke="none"
                        fill={`url(#${gradientId})`}
                    />

                    <Line
                        type="monotone"
                        dataKey="price"
                        stroke={lineColor}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 2 }}
                    />

                    <Tooltip
                        contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: 8,
                            fontSize: 12,
                        }}
                        labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                        formatter={(value: unknown) => [
                            typeof value === "number" ? value.toLocaleString("vi-VN") : String(value),
                            "Giá",
                        ]}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}
