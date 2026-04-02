"use client";

import { useMemo, CSSProperties, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Pin, TrendingUp, TrendingDown, Minus, Settings2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import type { StockWithPrice, DashboardBoard } from "@/lib/types";

interface SectorMiniBoardProps {
    board: DashboardBoard;
    stocks: StockWithPrice[];
    onSelectStock: (stock: StockWithPrice) => void;
    onTogglePin: (symbol: string) => void;
    onSettings?: () => void;
    onDelete?: () => void;
    onSeeAll?: () => void;
    // dnd-kit props
    attributes?: any;
    listeners?: any;
    setNodeRef?: (node: HTMLElement | null) => void;
    style?: CSSProperties;
    isDragging?: boolean;
}

export function SectorMiniBoard({
    board,
    stocks,
    onSelectStock,
    onTogglePin,
    onSettings,
    onDelete,
    onSeeAll,
    attributes,
    listeners,
    setNodeRef,
    style,
    isDragging
}: SectorMiniBoardProps) {
    const { title, symbols: pinnedSymbols = [], type, sector } = board;

    // Sorting state
    const [sortBy, setSortBy] = useState<string>("volume");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

    // Determine which stocks to show
    const displayStocks = useMemo(() => {
        let result = stocks;

        // If it's a custom board or has pinned symbols, filter first
        if (type === "custom" || (pinnedSymbols && pinnedSymbols.length > 0)) {
            result = stocks.filter(s => pinnedSymbols.includes(s.symbol));
        }

        // Apply sorting
        result = [...result].sort((a, b) => {
            let aVal: any = 0;
            let bVal: any = 0;

            switch (sortBy) {
                case "symbol":
                    aVal = a.symbol;
                    bVal = b.symbol;
                    break;
                case "price":
                    aVal = a.latest_price?.price ?? 0;
                    bVal = b.latest_price?.price ?? 0;
                    break;
                case "change":
                    aVal = a.latest_price?.change_percent ?? 0;
                    bVal = b.latest_price?.change_percent ?? 0;
                    break;
                case "volume":
                    aVal = a.latest_price?.volume ?? 0;
                    bVal = b.latest_price?.volume ?? 0;
                    break;
            }

            if (typeof aVal === "string") {
                return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }
            return sortDir === "asc" ? aVal - bVal : bVal - aVal;
        });

        // If it's a sector board and NO pins, limit to 15
        if (type === "sector" && (!pinnedSymbols || pinnedSymbols.length === 0)) {
            return result.slice(0, 15);
        }

        return result;
    }, [stocks, pinnedSymbols, type, sortBy, sortDir]);

    const formatPrice = (price: number | null | undefined) => {
        if (price === null || price === undefined) return "—";
        return price.toLocaleString("vi-VN");
    };

    // VN Market Color Logic
    const getVNColor = (changePercent: number | null | undefined) => {
        if (changePercent === null || changePercent === undefined) return "text-muted-foreground/60";
        if (changePercent >= 6.9) return "text-[#ff00ff]"; // Purple (Ceiling) - 7% but usually 6.9+
        if (changePercent <= -6.9) return "text-[#00ffff]"; // Cyan (Floor)
        if (changePercent > 0) return "text-[#00ffbb]"; // Green
        if (changePercent < 0) return "text-[#ff3b3b]"; // Red
        return "text-amber-400"; // Yellow
    };

    const handleSort = (col: string) => {
        if (sortBy === col) {
            setSortDir(prev => prev === "asc" ? "desc" : "asc");
        } else {
            setSortBy(col);
            setSortDir(col === "symbol" ? "asc" : "desc");
        }
    };

    // Calculate Index Contribution (Simplified for HOSE/VN-Index)
    const pointsContribution = useMemo(() => {
        const totalImpact = stocks.reduce((sum, s) => {
            if (!s.shares_outstanding || !s.latest_price?.change || s.exchange !== "HOSE") return sum;
            // Impact = PriceChange (VND) * SharesOutstanding (units)
            return sum + (s.latest_price.change * s.shares_outstanding);
        }, 0);

        // VN-Index Divisor ~4.7 Trillion (computed from real market data Feb 2026)
        // Formula: Divisor = Sum(Price_i * Shares_i) / IndexValue ≈ 4.7T
        const divisor = 4_700_000_000_000;
        return totalImpact / divisor;
    }, [stocks]);

    return (
        <Card
            ref={setNodeRef}
            style={style}
            className={`flex flex-col border-border/40 overflow-hidden bg-[#0d0d0d] backdrop-blur-sm group hover:border-emerald-500/30 transition-all duration-300 shadow-xl ${isDragging ? "opacity-50 z-50 ring-2 ring-emerald-500/50" : ""
                }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-2 py-1 border-b border-white/5 bg-white/[0.03]">
                <div className="flex items-center gap-1.5">
                    <button
                        {...attributes}
                        {...listeners}
                        className="p-0.5 hover:bg-white/10 rounded cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-white transition-colors"
                    >
                        <GripVertical className="h-3 w-3" />
                    </button>
                    <h3 className="text-[10px] font-black uppercase tracking-wider text-white/90 truncate max-w-[100px]">
                        {title}
                    </h3>
                    {pointsContribution !== 0 && (
                        <Badge variant="outline" className={`h-4 px-1 text-[8px] font-bold border-none transition-all duration-500 ${pointsContribution > 0 ? "bg-emerald-500/10 text-[#00ffbb]" : "bg-red-500/10 text-[#ff3b3b]"}`}>
                            {pointsContribution > 0 ? "+" : ""}{pointsContribution.toFixed(2)} pts
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onSettings && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onSettings(); }}
                            className="p-1 hover:bg-white/10 rounded text-muted-foreground hover:text-white transition-colors"
                        >
                            <Settings2 className="h-3 w-3" />
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                            className="p-1 hover:bg-red-500/20 rounded text-red-500 transition-colors"
                        >
                            <Minus className="h-3 w-3" />
                        </button>
                    )}
                </div>
            </div>

            {/* Compact Table */}
            <div className="flex-1 overflow-hidden">
                <table className="w-full text-[11px] border-collapse">
                    <thead className="bg-black/50 text-[9px] text-muted-foreground/40 uppercase font-black tracking-[0.1em]">
                        <tr className="border-b border-white/5">
                            <th className="text-left py-1 px-2 font-semibold cursor-pointer hover:text-white" onClick={() => handleSort("symbol")}>
                                <div className="flex items-center gap-1">
                                    Mã
                                    {sortBy === "symbol" && (sortDir === "asc" ? <ChevronUp className="h-2 w-2" /> : <ChevronDown className="h-2 w-2" />)}
                                </div>
                            </th>
                            <th className="text-right py-1.5 px-2 font-semibold cursor-pointer hover:text-white" onClick={() => handleSort("price")}>
                                <div className="flex items-center justify-end gap-1">
                                    Giá
                                    {sortBy === "price" && (sortDir === "asc" ? <ChevronUp className="h-2 w-2" /> : <ChevronDown className="h-2 w-2" />)}
                                </div>
                            </th>
                            <th className="text-right py-1.5 px-2 font-semibold cursor-pointer hover:text-white" onClick={() => handleSort("change")}>
                                <div className="flex items-center justify-end gap-1">
                                    %
                                    {sortBy === "change" && (sortDir === "asc" ? <ChevronUp className="h-2 w-2" /> : <ChevronDown className="h-2 w-2" />)}
                                </div>
                            </th>
                            <th className="text-right py-1.5 px-3 font-semibold cursor-pointer hover:text-white" onClick={() => handleSort("volume")}>
                                <div className="flex items-center justify-end gap-1">
                                    KL
                                    {sortBy === "volume" && (sortDir === "asc" ? <ChevronUp className="h-2 w-2" /> : <ChevronDown className="h-2 w-2" />)}
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {displayStocks.map((stock) => {
                            const p = stock.latest_price;
                            const changePercent = p?.change_percent ?? 0;
                            const vnColor = getVNColor(changePercent);
                            const isPinned = pinnedSymbols?.includes(stock.symbol);

                            return (
                                <tr
                                    key={stock.symbol}
                                    className="hover:bg-white/[0.04] cursor-pointer transition-colors group/row border-b border-white/[0.02]"
                                    onClick={() => onSelectStock(stock)}
                                >
                                    <td className="py-0.5 px-2">
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onTogglePin(stock.symbol);
                                                }}
                                                className={`transition-colors ${isPinned ? "text-amber-500" : "text-white/5 group-hover/row:text-white/20"}`}
                                            >
                                                <Pin className={`h-2 w-2 ${isPinned ? "fill-amber-500" : ""}`} />
                                            </button>
                                            <span className={`font-black text-[10px] tracking-tight ${vnColor}`}>{stock.symbol}</span>
                                        </div>
                                    </td>
                                    <td className={`py-0.5 px-2 text-right font-mono font-bold text-[10px] ${vnColor}`}>
                                        {formatPrice(p?.price)}
                                    </td>
                                    <td className="py-0.5 px-2 text-right font-mono">
                                        <div className={`flex items-center justify-end gap-0.5 ${vnColor} text-[10px]`}>
                                            {changePercent > 0 ? <TrendingUp className="h-2 w-2" /> : changePercent < 0 ? <TrendingDown className="h-2 w-2" /> : <Minus className="h-2 w-2" />}
                                            <span className="font-bold">{changePercent !== 0 ? Math.abs(changePercent).toFixed(1) : "0"}</span>
                                        </div>
                                    </td>
                                    <td className="py-0.5 px-2 text-right text-white/40 font-mono text-[9px]">
                                        {(p?.volume ?? 0) >= 1_000_000
                                            ? ((p?.volume ?? 0) / 1_000_000).toFixed(1) + "M"
                                            : (p?.volume ?? 0) >= 1_000
                                                ? ((p?.volume ?? 0) / 1_000).toFixed(0) + "K"
                                                : p?.volume ?? "—"}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {type === "sector" && stocks.length > 15 && (!pinnedSymbols || pinnedSymbols.length === 0) && (
                    <div className="p-0.5 px-2 text-left border-t border-white/5 bg-white/[0.01]">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onSeeAll?.();
                            }}
                            className="text-[8px] text-muted-foreground/50 hover:text-emerald-400 transition-colors uppercase font-bold tracking-widest"
                        >
                            + Xem thêm {stocks.length - 15} mã...
                        </button>
                    </div>
                )}
            </div>
        </Card>
    );
}
