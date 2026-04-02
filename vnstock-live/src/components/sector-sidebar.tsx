"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LayoutGrid, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { StockWithPrice } from "@/lib/types";

interface SectorSidebarProps {
    stocksWithPrices: StockWithPrice[];
    selectedSector: string;
    onSectorChange: (sector: string) => void;
    sectors: string[];
}

export function SectorSidebar({
    stocksWithPrices,
    selectedSector,
    onSectorChange,
    sectors,
}: SectorSidebarProps) {
    // Calculate stats for each sector
    const sectorStats = useMemo(() => {
        const stats: Record<string, { total: number; up: number; down: number; unchanged: number }> = {};

        // Initialize stats
        sectors.forEach(s => {
            stats[s] = { total: 0, up: 0, down: 0, unchanged: 0 };
        });

        // Add "All" stats
        stats["Tất cả ngành"] = { total: 0, up: 0, down: 0, unchanged: 0 };

        // Aggregate data
        stocksWithPrices.forEach(s => {
            if (!s.sector) return;

            const p = s.latest_price;
            const change = p?.change ?? 0;

            // For the specific sector
            if (stats[s.sector]) {
                stats[s.sector].total++;
                if (change > 0) stats[s.sector].up++;
                else if (change < 0) stats[s.sector].down++;
                else stats[s.sector].unchanged++;
            }

            // For All
            stats["Tất cả ngành"].total++;
            if (change > 0) stats["Tất cả ngành"].up++;
            else if (change < 0) stats["Tất cả ngành"].down++;
            else stats["Tất cả ngành"].unchanged++;
        });

        return stats;
    }, [stocksWithPrices, sectors]);

    return (
        <aside className="w-full lg:w-72 flex flex-col border-r border-border/40 bg-muted/20 h-full">
            <div className="p-4 border-b border-border/40">
                <div className="flex items-center gap-2 font-bold text-sm text-muted-foreground uppercase tracking-wider">
                    <LayoutGrid className="h-4 w-4" />
                    Thị trường theo ngành
                </div>
            </div>

            <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                    {["Tất cả ngành", ...sectors].map((sector) => {
                        const stat = sectorStats[sector] || { total: 0, up: 0, down: 0, unchanged: 0 };
                        const isActive = selectedSector === sector;

                        return (
                            <Button
                                key={sector}
                                variant={isActive ? "secondary" : "ghost"}
                                className={`w-full justify-start h-auto py-2.5 px-3 group transition-all duration-200 ${isActive
                                        ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15"
                                        : "hover:bg-muted/50"
                                    }`}
                                onClick={() => onSectorChange(sector)}
                            >
                                <div className="flex flex-col items-start w-full gap-1.5">
                                    <div className="flex items-center justify-between w-full">
                                        <span className={`text-[13px] font-semibold truncate max-w-[160px] ${isActive ? "text-emerald-600" : "text-foreground"
                                            }`}>
                                            {sector}
                                        </span>
                                        <Badge variant="outline" className="text-[10px] font-mono h-5 px-1.5 bg-background/50">
                                            {stat.total}
                                        </Badge>
                                    </div>

                                    <div className="flex items-center gap-3 w-full opacity-70 group-hover:opacity-100 transition-opacity">
                                        <div className="flex items-center gap-1">
                                            <TrendingUp className="h-3 w-3 text-emerald-500" />
                                            <span className="text-[10px] font-bold text-emerald-600 font-mono">{stat.up}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <TrendingDown className="h-3 w-3 text-red-500" />
                                            <span className="text-[10px] font-bold text-red-600 font-mono">{stat.down}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Minus className="h-3 w-3 text-amber-500" />
                                            <span className="text-[10px] font-bold text-amber-600 font-mono">{stat.unchanged}</span>
                                        </div>
                                    </div>
                                </div>
                            </Button>
                        );
                    })}
                </div>
            </ScrollArea>
        </aside>
    );
}
