"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface IndexData {
    name: string;
    value: number;
    change: number;
    changePercent: number;
    volume: string;
}

export function MarketIndices() {
    // Mock data for indices as we don't have a dedicated API for index totals yet
    const indices: IndexData[] = [
        { name: "VN-INDEX", value: 1245.67, change: 12.34, changePercent: 1.02, volume: "15,432 Tỷ" },
        { name: "VN30", value: 1256.89, change: 8.45, changePercent: 0.68, volume: "6,120 Tỷ" },
        { name: "HNX-INDEX", value: 234.56, change: -1.23, changePercent: -0.52, volume: "1,234 Tỷ" },
        { name: "UPCOM", value: 91.23, change: 0.45, changePercent: 0.49, volume: "567 Tỷ" },
    ];

    return (
        <div className="flex items-center gap-8 px-6 py-2.5 border-b border-white/5 bg-black/40 overflow-x-auto no-scrollbar backdrop-blur-md">
            {indices.map((idx) => {
                const isUp = idx.change > 0;
                const isDown = idx.change < 0;
                const colorClass = isUp ? "text-[#00ffbb]" : isDown ? "text-[#ff3b3b]" : "text-amber-400";

                return (
                    <div key={idx.name} className="flex flex-col min-w-fit">
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-muted-foreground">{idx.name}</span>
                            <span className={`text-sm font-bold font-mono ${colorClass}`}>
                                {idx.value.toLocaleString("vi-VN")}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-mono">
                            <div className={`flex items-center gap-0.5 ${colorClass}`}>
                                {isUp ? <TrendingUp className="h-2.5 w-2.5" /> : isDown ? <TrendingDown className="h-2.5 w-2.5" /> : <Minus className="h-2.5 w-2.5" />}
                                <span>{isUp ? "+" : ""}{idx.change.toFixed(2)}</span>
                                <span>({idx.changePercent.toFixed(2)}%)</span>
                            </div>
                            <span className="text-muted-foreground/60">{idx.volume}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
