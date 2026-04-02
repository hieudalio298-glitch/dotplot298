"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Star, TrendingUp, TrendingDown, Minus, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import type { Stock, LatestPrice, StockWithPrice } from "@/lib/types";

interface StockTableProps {
    searchQuery: string;
    selectedExchange: string;
    selectedSector: string;
    onSelectStock: (stock: StockWithPrice) => void;
    stocksWithPrices: StockWithPrice[];
}

function formatNumber(num: number | null | undefined): string {
    if (num === null || num === undefined) return "—";
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + "B";
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
    return num.toLocaleString("vi-VN");
}

function formatPrice(price: number | null | undefined): string {
    if (price === null || price === undefined) return "—";
    return price.toLocaleString("vi-VN");
}

// VN Market Color Logic
function getVNColor(changePercent: number | null | undefined): string {
    if (changePercent === null || changePercent === undefined) return "text-muted-foreground";
    if (changePercent >= 6.9) return "text-[#ff00ff]"; // Purple (Ceiling)
    if (changePercent <= -6.9) return "text-[#00ffff]"; // Cyan (Floor)
    if (changePercent > 0) return "text-emerald-500"; // Green
    if (changePercent < 0) return "text-red-500"; // Red
    return "text-amber-500"; // Yellow
}

function getVNColorBadge(changePercent: number | null | undefined): string {
    if (changePercent === null || changePercent === undefined) return "border-muted text-muted";
    if (changePercent >= 6.9) return "border-[#ff00ff]/50 text-[#ff00ff] bg-[#ff00ff]/10";
    if (changePercent <= -6.9) return "border-[#00ffff]/50 text-[#00ffff] bg-[#00ffff]/10";
    if (changePercent > 0) return "border-emerald-500/50 text-emerald-500 bg-emerald-500/10";
    if (changePercent < 0) return "border-red-500/50 text-red-500 bg-red-500/10";
    return "border-amber-500/50 text-amber-500 bg-amber-500/10";
}

function getPriceBgClass(change: number | null | undefined): string {
    if (change === null || change === undefined) return "";
    if (change > 0) return "bg-emerald-500/5";
    if (change < 0) return "bg-red-500/5";
    return "";
}

export function StockTable({
    searchQuery,
    selectedExchange,
    selectedSector,
    onSelectStock,
    stocksWithPrices,
}: StockTableProps) {
    const [sortBy, setSortBy] = useState<string>("volume");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const [flashIds, setFlashIds] = useState<Set<number>>(new Set());
    const lastPricesRef = useRef<Record<number, number | null>>({});

    // Flash effect detection
    useEffect(() => {
        const newFlashIds = new Set<number>();
        stocksWithPrices.forEach(s => {
            const currentPrice = s.latest_price?.price ?? null;
            const lastPrice = lastPricesRef.current[s.id];

            if (lastPrice !== undefined && currentPrice !== lastPrice && currentPrice !== null) {
                newFlashIds.add(s.id);
            }
            lastPricesRef.current[s.id] = currentPrice;
        });

        if (newFlashIds.size > 0) {
            setFlashIds(prev => new Set([...prev, ...newFlashIds]));
            const timer = setTimeout(() => {
                setFlashIds(prev => {
                    const next = new Set(prev);
                    newFlashIds.forEach(id => next.delete(id));
                    return next;
                });
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [stocksWithPrices]);

    // Filter & sort
    const filteredStocks = useMemo(() => {
        let result = stocksWithPrices;

        // Exchange filter
        if (selectedExchange && selectedExchange !== "Tất cả") {
            const exchangeMap: Record<string, string[]> = {
                HOSE: ["HOSE", "HSX", "hose"],
                HNX: ["HNX", "hnx"],
                UPCOM: ["UPCOM", "upcom"],
            };
            const valid = exchangeMap[selectedExchange] || [selectedExchange];
            result = result.filter((s: StockWithPrice) =>
                valid.some((e: string) => s.exchange?.toUpperCase() === e.toUpperCase())
            );
        }

        // Sector filter
        if (selectedSector && selectedSector !== "Tất cả ngành") {
            result = result.filter((s: StockWithPrice) => s.sector === selectedSector);
        }

        // Search filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(
                (s: StockWithPrice) =>
                    s.symbol.toLowerCase().includes(q) ||
                    s.name?.toLowerCase().includes(q) ||
                    s.full_name?.toLowerCase().includes(q)
            );
        }

        // Sort
        result = [...result].sort((a: StockWithPrice, b: StockWithPrice) => {
            let aVal: number | string = "";
            let bVal: number | string = "";

            switch (sortBy) {
                case "symbol":
                    aVal = a.symbol;
                    bVal = b.symbol;
                    break;
                case "sector":
                    aVal = a.sector ?? "";
                    bVal = b.sector ?? "";
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
                case "value":
                    aVal = a.latest_price?.value ?? 0;
                    bVal = b.latest_price?.value ?? 0;
                    break;
            }

            if (typeof aVal === "string") {
                return sortDir === "asc"
                    ? aVal.localeCompare(bVal as string)
                    : (bVal as string).localeCompare(aVal);
            }
            return sortDir === "asc"
                ? (aVal as number) - (bVal as number)
                : (bVal as number) - (aVal as number);
        });

        return result;
    }, [stocksWithPrices, searchQuery, selectedExchange, selectedSector, sortBy, sortDir]);

    const handleSort = useCallback(
        (col: string) => {
            if (sortBy === col) {
                setSortDir((d) => (d === "asc" ? "desc" : "asc"));
            } else {
                setSortBy(col);
                setSortDir(col === "symbol" || col === "sector" ? "asc" : "desc");
            }
        },
        [sortBy]
    );

    const SortIcon = ({ col }: { col: string }) => {
        if (sortBy !== col) return null;
        return <span className="ml-1 text-xs">{sortDir === "asc" ? <ChevronUp className="inline h-3 w-3" /> : <ChevronDown className="inline h-3 w-3" />}</span>;
    };

    return (
        <Card className="overflow-hidden border-border/50 bg-black/20 backdrop-blur-sm flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm shadow-sm">
                        <tr className="border-b border-border/50">
                            <TableHead className="w-[100px] cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort("symbol")}>
                                Mã CK <SortIcon col="symbol" />
                            </TableHead>
                            <TableHead className="cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort("sector")}>
                                Ngành <SortIcon col="sector" />
                            </TableHead>
                            <TableHead className="text-right">Sàn</TableHead>
                            <th
                                className="text-right py-3 px-4 font-semibold cursor-pointer hover:bg-white/5 transition-colors"
                                onClick={() => handleSort("price")}
                            >
                                Giá <SortIcon col="price" />
                            </th>
                            <th
                                className="text-right py-3 px-4 font-semibold cursor-pointer hover:bg-white/5 transition-colors"
                                onClick={() => handleSort("change")}
                            >
                                +/-/% <SortIcon col="change" />
                            </th>
                            <th
                                className="text-right py-3 px-4 font-semibold cursor-pointer hover:bg-white/5 transition-colors hidden md:table-cell"
                                onClick={() => handleSort("volume")}
                            >
                                KL <SortIcon col="volume" />
                            </th>
                            <th
                                className="text-right py-3 px-4 font-semibold cursor-pointer hover:bg-white/5 transition-colors hidden lg:table-cell"
                                onClick={() => handleSort("value")}
                            >
                                GT (VNĐ) <SortIcon col="value" />
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStocks.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center py-12 text-muted-foreground">
                                    {searchQuery
                                        ? `Không tìm thấy mã "${searchQuery}"`
                                        : "Chưa có dữ liệu. Hãy chạy worker để cập nhật giá."}
                                </td>
                            </tr>
                        ) : (
                            filteredStocks.map((stock) => {
                                const p = stock.latest_price;
                                const change = p?.change ?? null;
                                const changePercent = p?.change_percent ?? null;
                                const isFlashing = flashIds.has(stock.id);
                                const colorClass = getVNColor(changePercent);

                                return (
                                    <tr
                                        key={stock.id}
                                        className={`border-b border-border/30 cursor-pointer transition-all duration-300 hover:bg-muted/50 ${isFlashing ? "animate-pulse " + getPriceBgClass(change) : ""
                                            }`}
                                        onClick={() => onSelectStock(stock)}
                                    >
                                        <TableCell>
                                            <div className="font-bold text-foreground">{stock.symbol}</div>
                                            <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                                                {stock.full_name || stock.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-xs text-muted-foreground truncate max-w-[120px]">
                                                {stock.sector || "—"}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge
                                                variant="outline"
                                                className="text-[10px] px-1.5 py-0 font-medium"
                                            >
                                                {stock.exchange}
                                            </Badge>
                                        </TableCell>

                                        {/* Price */}
                                        <td className={`py-2.5 px-4 text-right font-mono font-bold ${colorClass}`}>
                                            {formatPrice(p?.price)}
                                        </td>

                                        {/* Change & % Combined for cleaner look */}
                                        <td className={`py-2.5 px-4 text-right font-mono`}>
                                            <div className="flex flex-col items-end gap-0.5">
                                                <div className={`flex items-center gap-1 ${colorClass}`}>
                                                    {change !== null && change > 0 && <TrendingUp className="h-3 w-3" />}
                                                    {change !== null && change < 0 && <TrendingDown className="h-3 w-3" />}
                                                    {change !== null && change === 0 && <Minus className="h-3 w-3" />}
                                                    <span className="font-bold">{change !== null ? (change > 0 ? "+" : "") + formatPrice(change) : "—"}</span>
                                                </div>
                                                <Badge
                                                    variant="outline"
                                                    className={`text-[10px] font-mono px-1.5 py-0 border-none ${getVNColorBadge(changePercent)}`}
                                                >
                                                    {changePercent !== null
                                                        ? (changePercent > 0 ? "+" : "") + changePercent.toFixed(2) + "%"
                                                        : "—"}
                                                </Badge>
                                            </div>
                                        </td>

                                        {/* Volume */}
                                        <td className="py-2.5 px-4 text-right text-muted-foreground font-mono hidden md:table-cell">
                                            {formatNumber(p?.volume ?? null)}
                                        </td>

                                        {/* Value */}
                                        <td className="py-2.5 px-4 text-right text-muted-foreground font-mono hidden lg:table-cell">
                                            {formatNumber(p?.value ?? null)}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </ScrollArea>
            <div className="px-4 py-2 border-t border-border/30 text-xs text-muted-foreground flex items-center justify-between bg-muted/30">
                <span>{filteredStocks.length} mã cổ phiếu</span>
                <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Realtime
                </span>
            </div>
        </Card>
    );
}
