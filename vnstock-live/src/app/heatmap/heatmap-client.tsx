"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Stock, LatestPrice, StockWithPrice } from "@/lib/types";

interface HeatmapClientProps {
    initialStocks: Stock[];
    initialPrices: LatestPrice[];
}

// ---------- Treemap layout (squarified) ----------
interface TreemapRect {
    x: number;
    y: number;
    w: number;
    h: number;
}

interface TreemapNode {
    stock: StockWithPrice;
    value: number; // market cap or volume
    rect: TreemapRect;
}

interface SectorGroup {
    sector: string;
    nodes: TreemapNode[];
    totalValue: number;
    rect: TreemapRect;
}

function squarify(
    items: { value: number;[k: string]: any }[],
    container: TreemapRect
): TreemapRect[] {
    if (items.length === 0) return [];
    if (items.length === 1) return [{ ...container }];

    const total = items.reduce((s, i) => s + i.value, 0);
    if (total <= 0) return items.map(() => ({ x: 0, y: 0, w: 0, h: 0 }));

    const rects: TreemapRect[] = new Array(items.length);
    layoutStrip(items, 0, items.length, container, total, rects);
    return rects;
}

function layoutStrip(
    items: { value: number }[],
    start: number,
    end: number,
    rect: TreemapRect,
    totalValue: number,
    out: TreemapRect[]
) {
    if (start >= end) return;
    if (end - start === 1) {
        out[start] = { ...rect };
        return;
    }

    const isWide = rect.w >= rect.h;
    let rowSum = 0;
    let bestRatio = Infinity;
    let split = start + 1;

    for (let i = start; i < end; i++) {
        rowSum += items[i].value;
        const frac = rowSum / totalValue;
        const stripSize = isWide ? rect.w * frac : rect.h * frac;
        const remaining = end - start;

        // Compute worst aspect ratio in this strip
        let tempSum = 0;
        let worstRatio = 0;
        for (let j = start; j <= i; j++) {
            tempSum += items[j].value;
            const itemFrac = items[j].value / rowSum;
            const itemLen = isWide ? rect.h * itemFrac : rect.w * itemFrac;
            const ratio = stripSize > 0 && itemLen > 0
                ? Math.max(stripSize / itemLen, itemLen / stripSize)
                : Infinity;
            worstRatio = Math.max(worstRatio, ratio);
        }

        if (worstRatio <= bestRatio) {
            bestRatio = worstRatio;
            split = i + 1;
        } else {
            break;
        }
    }

    // Layout the strip [start, split)
    let stripTotal = 0;
    for (let i = start; i < split; i++) stripTotal += items[i].value;
    const stripFrac = stripTotal / totalValue;

    let offset = 0;
    for (let i = start; i < split; i++) {
        const itemFrac = items[i].value / stripTotal;
        if (isWide) {
            const sw = rect.w * stripFrac;
            const sh = rect.h * itemFrac;
            out[i] = { x: rect.x, y: rect.y + offset, w: sw, h: sh };
            offset += sh;
        } else {
            const sw = rect.w * itemFrac;
            const sh = rect.h * stripFrac;
            out[i] = { x: rect.x + offset, y: rect.y, w: sw, h: sh };
            offset += sw;
        }
    }

    // Recurse on remaining
    const remaining: TreemapRect = isWide
        ? { x: rect.x + rect.w * stripFrac, y: rect.y, w: rect.w * (1 - stripFrac), h: rect.h }
        : { x: rect.x, y: rect.y + rect.h * stripFrac, w: rect.w, h: rect.h * (1 - stripFrac) };

    layoutStrip(items, split, end, remaining, totalValue - stripTotal, out);
}

// ---------- Color logic ----------
function getChangeColor(pct: number | null | undefined): string {
    if (pct === null || pct === undefined) return "hsl(45, 80%, 30%)"; // dim yellow
    if (pct >= 6.9) return "#ff00ff";   // ceiling purple
    if (pct <= -6.9) return "#00ffff";  // floor cyan
    if (pct > 0) {
        const intensity = Math.min(pct / 5, 1);
        const l = 35 - intensity * 15; // 35 → 20
        const s = 60 + intensity * 30; // 60 → 90
        return `hsl(155, ${s}%, ${l}%)`;
    }
    if (pct < 0) {
        const intensity = Math.min(Math.abs(pct) / 5, 1);
        const l = 35 - intensity * 15;
        const s = 60 + intensity * 30;
        return `hsl(0, ${s}%, ${l}%)`;
    }
    return "hsl(45, 60%, 35%)"; // reference / 0%
}

function getTextColor(pct: number | null | undefined): string {
    if (pct === null || pct === undefined) return "#888";
    if (pct >= 6.9) return "#ff00ff";
    if (pct <= -6.9) return "#00ffff";
    if (pct > 0) return "#00ffbb";
    if (pct < 0) return "#ff3b3b";
    return "#fbbf24"; // amber
}

// ---------- Formatters ----------
function fmtPrice(p: number | null | undefined): string {
    if (!p) return "—";
    return (p / 1000).toFixed(1);
}

function fmtVol(v: number | null | undefined): string {
    if (!v) return "";
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
    if (v >= 1_000) return (v / 1_000).toFixed(0) + "K";
    return String(v);
}

// ---------- Main Component ----------
export function HeatmapClient({ initialStocks, initialPrices }: HeatmapClientProps) {
    const [stocks] = useState<Stock[]>(initialStocks);
    const [prices, setPrices] = useState<LatestPrice[]>(initialPrices);
    const [exchangeFilter, setExchangeFilter] = useState<string>("HOSE");
    const [sizeMode, setSizeMode] = useState<"cap" | "volume">("cap");
    const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 1200, height: 700 });

    // Resize observer
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const ro = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            setDimensions({ width: Math.floor(width), height: Math.floor(Math.max(height, 500)) });
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Real-time price updates
    useEffect(() => {
        const supabase = createClient();
        const channel = supabase
            .channel("heatmap-prices")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "latest_prices" },
                (payload: any) => {
                    if (payload.new) {
                        setPrices((prev) =>
                            prev.map((p) =>
                                p.stock_id === payload.new.stock_id ? { ...p, ...payload.new } : p
                            )
                        );
                    }
                }
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    // Merge stocks + prices
    const stocksWithPrice = useMemo<StockWithPrice[]>(() => {
        const priceMap = new Map(prices.map((p) => [p.stock_id, p]));
        return stocks.map((s) => ({ ...s, latest_price: priceMap.get(s.id) ?? null }));
    }, [stocks, prices]);

    // Filtered & grouped data
    const sectorGroups = useMemo<SectorGroup[]>(() => {
        const filtered = stocksWithPrice.filter((s) => {
            if (exchangeFilter !== "ALL" && s.exchange !== exchangeFilter) return false;
            if (!s.sector) return false;
            return true;
        });

        // Group by sector
        const groups = new Map<string, StockWithPrice[]>();
        for (const s of filtered) {
            const key = s.sector!;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(s);
        }

        // Build sector groups with values
        const result: SectorGroup[] = [];
        for (const [sector, sectorStocks] of groups) {
            const nodes: TreemapNode[] = sectorStocks
                .map((s) => {
                    let value: number;
                    if (sizeMode === "cap") {
                        value = (s.latest_price?.price ?? 0) * (s.shares_outstanding ?? 0);
                    } else {
                        value = s.latest_price?.volume ?? 0;
                    }
                    return { stock: s, value, rect: { x: 0, y: 0, w: 0, h: 0 } };
                })
                .filter((n) => n.value > 0)
                .sort((a, b) => b.value - a.value);

            if (nodes.length === 0) continue;
            const totalValue = nodes.reduce((s, n) => s + n.value, 0);
            result.push({ sector, nodes, totalValue, rect: { x: 0, y: 0, w: 0, h: 0 } });
        }

        result.sort((a, b) => b.totalValue - a.totalValue);
        return result;
    }, [stocksWithPrice, exchangeFilter, sizeMode]);

    // Compute treemap layout
    const layoutData = useMemo(() => {
        if (sectorGroups.length === 0) return [];
        const { width, height } = dimensions;

        // First: layout sector rectangles
        const sectorValues = sectorGroups.map((g) => ({ value: g.totalValue }));
        const sectorRects = squarify(sectorValues, { x: 0, y: 0, w: width, h: height });

        // Then: layout stocks within each sector
        return sectorGroups.map((group, i) => {
            const sRect = sectorRects[i] || { x: 0, y: 0, w: 0, h: 0 };
            // Leave room for sector label
            const labelH = 16;
            const innerRect: TreemapRect = {
                x: sRect.x + 1,
                y: sRect.y + labelH + 1,
                w: Math.max(sRect.w - 2, 0),
                h: Math.max(sRect.h - labelH - 2, 0),
            };

            const stockValues = group.nodes.map((n) => ({ value: n.value }));
            const stockRects = squarify(stockValues, innerRect);

            const nodes = group.nodes.map((n, j) => ({
                ...n,
                rect: stockRects[j] || { x: 0, y: 0, w: 0, h: 0 },
            }));

            return { ...group, rect: sRect, nodes };
        });
    }, [sectorGroups, dimensions]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        setTooltipPos({ x: e.clientX, y: e.clientY });
    }, []);

    const hoveredStock = useMemo(() => {
        if (!hoveredSymbol) return null;
        return stocksWithPrice.find((s) => s.symbol === hoveredSymbol) ?? null;
    }, [hoveredSymbol, stocksWithPrice]);

    return (
        <div className="flex flex-col h-[calc(100vh-56px)] bg-[#0a0a0a]">
            {/* Toolbar */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-white/10 bg-[#0d0d0d]">
                <h1 className="text-sm font-bold text-white/90 uppercase tracking-wider mr-4">
                    🗺️ Heatmap
                </h1>

                {/* Exchange Filter */}
                <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
                    {["HOSE", "HNX", "UPCOM", "ALL"].map((ex) => (
                        <button
                            key={ex}
                            onClick={() => setExchangeFilter(ex)}
                            className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${exchangeFilter === ex
                                ? "bg-emerald-500/20 text-emerald-400 shadow-sm"
                                : "text-white/40 hover:text-white/70"
                                }`}
                        >
                            {ex === "ALL" ? "Tất cả" : ex}
                        </button>
                    ))}
                </div>

                {/* Size Mode */}
                <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5 ml-2">
                    <button
                        onClick={() => setSizeMode("cap")}
                        className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${sizeMode === "cap"
                            ? "bg-cyan-500/20 text-cyan-400"
                            : "text-white/40 hover:text-white/70"
                            }`}
                    >
                        Vốn hóa
                    </button>
                    <button
                        onClick={() => setSizeMode("volume")}
                        className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${sizeMode === "volume"
                            ? "bg-cyan-500/20 text-cyan-400"
                            : "text-white/40 hover:text-white/70"
                            }`}
                    >
                        KLGD
                    </button>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-1 ml-auto text-[9px] font-mono">
                    <span className="text-[#00ffff] font-bold">Sàn</span>
                    <div className="flex h-3">
                        {[
                            "hsl(0,90%,20%)", "hsl(0,75%,25%)", "hsl(0,60%,30%)",
                            "hsl(45,60%,35%)",
                            "hsl(155,60%,30%)", "hsl(155,75%,25%)", "hsl(155,90%,20%)",
                        ].map((c, i) => (
                            <div key={i} className="w-4 h-full" style={{ background: c }} />
                        ))}
                    </div>
                    <span className="text-[#ff00ff] font-bold">Trần</span>
                </div>
            </div>

            {/* Treemap */}
            <div
                ref={containerRef}
                className="flex-1 relative overflow-hidden"
                onMouseMove={handleMouseMove}
            >
                <svg
                    width={dimensions.width}
                    height={dimensions.height}
                    className="absolute inset-0"
                >
                    {layoutData.map((group) => (
                        <g key={group.sector}>
                            {/* Sector border */}
                            <rect
                                x={group.rect.x}
                                y={group.rect.y}
                                width={group.rect.w}
                                height={group.rect.h}
                                fill="none"
                                stroke="rgba(255,255,255,0.08)"
                                strokeWidth={1}
                            />
                            {/* Sector label */}
                            {group.rect.w > 40 && (
                                <text
                                    x={group.rect.x + 4}
                                    y={group.rect.y + 12}
                                    fill="rgba(255,255,255,0.5)"
                                    fontSize={group.rect.w > 120 ? 10 : 8}
                                    fontWeight="bold"
                                    fontFamily="var(--font-geist-sans)"
                                >
                                    {group.sector}
                                </text>
                            )}
                            {/* Stock cells */}
                            {group.nodes.map((node) => {
                                const pct = node.stock.latest_price?.change_percent;
                                const isHovered = hoveredSymbol === node.stock.symbol;
                                const minDim = Math.min(node.rect.w, node.rect.h);

                                return (
                                    <g
                                        key={node.stock.symbol}
                                        onMouseEnter={() => setHoveredSymbol(node.stock.symbol)}
                                        onMouseLeave={() => setHoveredSymbol(null)}
                                        style={{ cursor: "pointer" }}
                                    >
                                        <rect
                                            x={node.rect.x + 0.5}
                                            y={node.rect.y + 0.5}
                                            width={Math.max(node.rect.w - 1, 0)}
                                            height={Math.max(node.rect.h - 1, 0)}
                                            fill={getChangeColor(pct)}
                                            rx={2}
                                            opacity={isHovered ? 1 : 0.85}
                                            stroke={isHovered ? "white" : "rgba(0,0,0,0.3)"}
                                            strokeWidth={isHovered ? 2 : 0.5}
                                            style={{ transition: "opacity 0.15s, stroke-width 0.15s" }}
                                        />
                                        {/* Symbol */}
                                        {minDim > 20 && node.rect.w > 30 && (
                                            <text
                                                x={node.rect.x + node.rect.w / 2}
                                                y={node.rect.y + node.rect.h / 2 - (minDim > 40 ? 5 : 0)}
                                                textAnchor="middle"
                                                dominantBaseline="central"
                                                fill="white"
                                                fontSize={Math.min(Math.max(minDim / 4, 8), 14)}
                                                fontWeight="900"
                                                fontFamily="var(--font-geist-mono)"
                                                style={{ pointerEvents: "none", textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
                                            >
                                                {node.stock.symbol}
                                            </text>
                                        )}
                                        {/* Change % */}
                                        {minDim > 40 && node.rect.w > 40 && (
                                            <text
                                                x={node.rect.x + node.rect.w / 2}
                                                y={node.rect.y + node.rect.h / 2 + 9}
                                                textAnchor="middle"
                                                dominantBaseline="central"
                                                fill={getTextColor(pct)}
                                                fontSize={Math.min(Math.max(minDim / 5, 7), 11)}
                                                fontWeight="bold"
                                                fontFamily="var(--font-geist-mono)"
                                                style={{ pointerEvents: "none" }}
                                            >
                                                {pct !== null && pct !== undefined
                                                    ? `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`
                                                    : "0%"}
                                            </text>
                                        )}
                                        {/* Price */}
                                        {minDim > 55 && node.rect.w > 50 && (
                                            <text
                                                x={node.rect.x + node.rect.w / 2}
                                                y={node.rect.y + node.rect.h / 2 + 22}
                                                textAnchor="middle"
                                                dominantBaseline="central"
                                                fill="rgba(255,255,255,0.5)"
                                                fontSize={7}
                                                fontFamily="var(--font-geist-mono)"
                                                style={{ pointerEvents: "none" }}
                                            >
                                                {fmtPrice(node.stock.latest_price?.price)}
                                            </text>
                                        )}
                                    </g>
                                );
                            })}
                        </g>
                    ))}
                </svg>

                {/* Tooltip */}
                {hoveredStock && (
                    <div
                        className="fixed z-[9999] pointer-events-none bg-black/95 border border-white/20 rounded-lg px-3 py-2 shadow-2xl backdrop-blur-sm"
                        style={{
                            left: tooltipPos.x + 16,
                            top: tooltipPos.y - 10,
                            maxWidth: 280,
                        }}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-black text-white text-sm">{hoveredStock.symbol}</span>
                            <span className="text-[10px] text-white/50">{hoveredStock.exchange}</span>
                        </div>
                        <div className="text-[10px] text-white/60 mb-1.5 leading-tight">
                            {hoveredStock.full_name || hoveredStock.name}
                        </div>
                        <div className="text-[10px] text-white/40 mb-0.5">{hoveredStock.sector}</div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] mt-1 border-t border-white/10 pt-1">
                            <span className="text-white/40">Giá:</span>
                            <span className="text-right font-mono text-white/80">
                                {fmtPrice(hoveredStock.latest_price?.price)}
                            </span>
                            <span className="text-white/40">Thay đổi:</span>
                            <span className={`text-right font-mono font-bold ${(hoveredStock.latest_price?.change_percent ?? 0) > 0
                                ? "text-[#00ffbb]"
                                : (hoveredStock.latest_price?.change_percent ?? 0) < 0
                                    ? "text-[#ff3b3b]"
                                    : "text-amber-400"
                                }`}>
                                {hoveredStock.latest_price?.change_percent !== null
                                    ? `${(hoveredStock.latest_price?.change_percent ?? 0) > 0 ? "+" : ""}${(hoveredStock.latest_price?.change_percent ?? 0).toFixed(2)}%`
                                    : "—"}
                            </span>
                            <span className="text-white/40">KL:</span>
                            <span className="text-right font-mono text-white/80">
                                {fmtVol(hoveredStock.latest_price?.volume)}
                            </span>
                            <span className="text-white/40">Ref:</span>
                            <span className="text-right font-mono text-white/80">
                                {fmtPrice(hoveredStock.latest_price?.ref_price)}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
