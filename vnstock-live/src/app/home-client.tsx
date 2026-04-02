"use client";

import { useState, useEffect, useMemo } from "react";
import { StockTable } from "@/components/stock-table";
import { StockFilters } from "@/components/stock-filters";
import { StockDetailModal } from "@/components/stock-detail-modal";
import { MarketIndices } from "@/components/market-indices";
import { SectorMiniBoard } from "@/components/sector-mini-board";
import { createClient } from "@/lib/supabase/client";
import { Activity, LayoutGrid, List, Plus, Search as SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BoardSettingsModal } from "@/components/board-settings-modal";
import type { StockWithPrice, Stock, LatestPrice, DashboardBoard } from "@/lib/types";

// DnD Kit Imports
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
    defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface HomeClientProps {
    initialStocks: Stock[];
    initialPrices: LatestPrice[];
    sectors: string[];
}

// Sortable Item Wrapper
function SortableBoard({
    board,
    boardStocks,
    handleSelectStock,
    handleSaveBoard,
    setEditingBoard,
    handleDeleteBoard,
    setSelectedSector,
    setViewMode
}: {
    board: DashboardBoard;
    boardStocks: StockWithPrice[];
    handleSelectStock: (s: StockWithPrice) => void;
    handleSaveBoard: (id: string, updates: Partial<DashboardBoard>) => void;
    setEditingBoard: (b: DashboardBoard) => void;
    handleDeleteBoard: (id: string) => void;
    setSelectedSector: (s: string) => void;
    setViewMode: (v: "grid" | "table") => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: board.id });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="mb-3 break-inside-avoid"
        >
            <SectorMiniBoard
                board={board}
                stocks={boardStocks}
                onSelectStock={handleSelectStock}
                onTogglePin={(sym) => {
                    const newSymbols = board.symbols.includes(sym)
                        ? board.symbols.filter(s => s !== sym)
                        : [...board.symbols, sym];
                    handleSaveBoard(board.id, { symbols: newSymbols });
                }}
                onSettings={() => setEditingBoard(board)}
                onDelete={() => handleDeleteBoard(board.id)}
                onSeeAll={board.type === "sector" ? () => {
                    setSelectedSector(board.sector!);
                    setViewMode("table");
                } : undefined}
                attributes={attributes}
                listeners={listeners}
                isDragging={isDragging}
            />
        </div>
    );
}

export function HomeClient({ initialStocks, initialPrices, sectors }: HomeClientProps) {
    const [stocksWithPrices, setStocksWithPrices] = useState<StockWithPrice[]>(() => {
        const priceMap = new Map();
        initialPrices.forEach(p => priceMap.set(p.stock_id, p));
        return initialStocks.map(s => ({
            ...s,
            latest_price: priceMap.get(s.id) || null
        }));
    });
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedExchange, setSelectedExchange] = useState("Tất cả");
    const [selectedSector, setSelectedSector] = useState("Tất cả ngành");
    const [selectedStock, setSelectedStock] = useState<StockWithPrice | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
    // Dashboard Boards Configuration
    const [dashboardBoards, setDashboardBoards] = useState<DashboardBoard[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);
    const [editingBoard, setEditingBoard] = useState<DashboardBoard | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Avoid accidental drags when clicking
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Initial load from localStorage
    useEffect(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("dashboard_config");
            if (saved) {
                try {
                    setDashboardBoards(JSON.parse(saved));
                } catch (e) {
                    console.error("Failed to parse dashboard config", e);
                }
            } else {
                // Default boards based on sectors
                const defaults: DashboardBoard[] = sectors.map(s => ({
                    id: `sector-${s}`,
                    title: s === "Tất cả ngành" ? "VN30 Highlights" : s,
                    symbols: [], // Empty means show top stocks by volume from this sector
                    type: "sector",
                    sector: s
                }));
                setDashboardBoards(defaults);
            }
            setIsInitialized(true);
        }
    }, [sectors]);

    // Save to localStorage
    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem("dashboard_config", JSON.stringify(dashboardBoards));
        }
    }, [dashboardBoards, isInitialized]);

    const handleAddBoard = () => {
        const newBoard: DashboardBoard = {
            id: Date.now().toString(),
            title: "Bảng mới",
            symbols: [],
            type: "custom"
        };
        setDashboardBoards([...dashboardBoards, newBoard]);
        setEditingBoard(newBoard);
    };

    const handleDeleteBoard = (id: string) => {
        setDashboardBoards(dashboardBoards.filter(b => b.id !== id));
    };

    const handleSaveBoard = (id: string, updates: Partial<DashboardBoard>) => {
        setDashboardBoards(dashboardBoards.map(b =>
            b.id === id ? { ...b, ...updates } : b
        ));
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        if (over && active.id !== over.id) {
            setDashboardBoards((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleTogglePin = (symbol: string) => {
        // This now just updates the watchlist which is shared
    };

    // Realtime subscription
    useEffect(() => {
        const supabase = createClient();
        const channel = supabase
            .channel("home_prices_sync")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "latest_prices" },
                (payload) => {
                    const newPrice = payload.new as LatestPrice;
                    if (newPrice) {
                        setStocksWithPrices(prev => prev.map(s =>
                            s.id === newPrice.stock_id ? { ...s, latest_price: newPrice } : s
                        ));
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const handleSelectStock = (stock: StockWithPrice) => {
        setSelectedStock(stock);
        setModalOpen(true);
    };

    const groupedStocks = useMemo(() => {
        const groups: Record<string, StockWithPrice[]> = {};
        sectors.forEach(s => groups[s] = []);
        stocksWithPrices.forEach(s => {
            if (s.sector && groups[s.sector]) {
                groups[s.sector].push(s);
            }
        });
        return groups;
    }, [stocksWithPrices, sectors]);

    const activeBoard = useMemo(() =>
        dashboardBoards.find(b => b.id === activeId),
        [activeId, dashboardBoards]);

    const activeBoardStocks = useMemo(() => {
        if (!activeBoard) return [];
        if (activeBoard.symbols.length > 0) {
            return activeBoard.symbols
                .map(sym => stocksWithPrices.find(s => s.symbol === sym))
                .filter((s): s is StockWithPrice => !!s);
        } else if (activeBoard.type === "sector" && activeBoard.sector) {
            return (groupedStocks[activeBoard.sector] || [])
                .sort((a, b) => (b.latest_price?.volume ?? 0) - (a.latest_price?.volume ?? 0));
        }
        return [];
    }, [activeBoard, stocksWithPrices, groupedStocks]);

    return (
        <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden bg-[#0a0a0a] text-foreground selection:bg-emerald-500/30">
            {/* Top Market Indices */}
            <MarketIndices />

            {/* Sub Header / Filters */}
            <div className="px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <div className="flex bg-white/5 p-1 rounded-lg">
                        <Button
                            variant={viewMode === "grid" ? "default" : "ghost"}
                            size="sm"
                            className={`h-7 px-4 text-[11px] font-black gap-1.5 transition-all duration-300 ${viewMode === "grid"
                                ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] border-0"
                                : "text-muted-foreground hover:text-white"
                                }`}
                            onClick={() => setViewMode("grid")}
                        >
                            <LayoutGrid className="h-4 w-4" />
                            DASHBOARD
                        </Button>
                        <Button
                            variant={viewMode === "table" ? "default" : "ghost"}
                            size="sm"
                            className={`h-7 px-4 text-[11px] font-black gap-1.5 transition-all duration-300 ${viewMode === "table"
                                ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] border-0"
                                : "text-muted-foreground hover:text-white"
                                }`}
                            onClick={() => setViewMode("table")}
                        >
                            <List className="h-4 w-4" />
                            BẢNG GIÁ
                        </Button>
                    </div>

                    <button
                        onClick={handleAddBoard}
                        className="h-7 px-3 flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-lg text-[10px] font-black transition-all border border-emerald-500/20 uppercase tracking-widest"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Thêm bảng
                    </button>
                </div>

                <StockFilters
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    selectedExchange={selectedExchange}
                    onExchangeChange={setSelectedExchange}
                />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 min-h-0 bg-black">
                <ScrollArea className="h-full">
                    <div className="p-1.5 md:p-2">
                        {viewMode === "grid" ? (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={dashboardBoards.map(b => b.id)}
                                    strategy={rectSortingStrategy}
                                >
                                    <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-5 xl:columns-6 2xl:columns-8 3xl:columns-10 4xl:columns-12 gap-2 pb-20">
                                        {dashboardBoards.map(board => {
                                            const isSectorBoard = board.type === "sector";
                                            let boardStocks = stocksWithPrices;

                                            if (board.symbols.length > 0) {
                                                boardStocks = board.symbols
                                                    .map(sym => stocksWithPrices.find(s => s.symbol === sym))
                                                    .filter((s): s is StockWithPrice => !!s);
                                            } else if (isSectorBoard && board.sector) {
                                                boardStocks = (groupedStocks[board.sector] || [])
                                                    .sort((a, b) => (b.latest_price?.volume ?? 0) - (a.latest_price?.volume ?? 0));
                                            }

                                            return (
                                                <SortableBoard
                                                    key={board.id}
                                                    board={board}
                                                    boardStocks={boardStocks}
                                                    handleSelectStock={handleSelectStock}
                                                    handleSaveBoard={handleSaveBoard}
                                                    setEditingBoard={setEditingBoard}
                                                    handleDeleteBoard={handleDeleteBoard}
                                                    setSelectedSector={setSelectedSector}
                                                    setViewMode={setViewMode}
                                                />
                                            );
                                        })}

                                        {/* Simplified Add Board Placeholder */}
                                        <div className="mb-3 break-inside-avoid">
                                            <button
                                                onClick={handleAddBoard}
                                                className="w-full flex flex-col items-center justify-center gap-2 border border-dashed border-white/5 bg-white/[0.01] rounded-xl hover:bg-white/[0.03] hover:border-emerald-500/20 transition-all group py-10"
                                            >
                                                <Plus className="h-5 w-5 text-white/10 group-hover:text-emerald-500 transition-colors" />
                                                <span className="text-[10px] font-black text-white/10 group-hover:text-emerald-500 uppercase tracking-[0.2em]">Thêm bảng</span>
                                            </button>
                                        </div>
                                    </div>
                                </SortableContext>

                                <DragOverlay adjustScale={true}>
                                    {activeId && activeBoard ? (
                                        <div className="scale-105 shadow-2xl shadow-black/50 rotate-1 cursor-grabbing">
                                            <SectorMiniBoard
                                                board={activeBoard}
                                                stocks={activeBoardStocks}
                                                onSelectStock={handleSelectStock}
                                                onTogglePin={() => { }}
                                                onSettings={() => { }}
                                                onDelete={() => { }}
                                                isDragging={true}
                                            />
                                        </div>
                                    ) : null}
                                </DragOverlay>
                            </DndContext>
                        ) : (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <h1 className="text-xl font-bold mb-4 text-emerald-400 uppercase tracking-widest flex items-center gap-2 px-2">
                                    <Activity className="h-5 w-5" />
                                    Chi tiết thị trường
                                </h1>
                                <StockTable
                                    searchQuery={searchQuery}
                                    selectedExchange={selectedExchange}
                                    selectedSector={selectedSector}
                                    onSelectStock={handleSelectStock}
                                    stocksWithPrices={stocksWithPrices}
                                />
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Detail Modal */}
            <StockDetailModal
                stock={selectedStock}
                open={modalOpen}
                onClose={() => setModalOpen(false)}
            />

            {/* Board Settings Modal */}
            <BoardSettingsModal
                open={!!editingBoard}
                onClose={() => setEditingBoard(null)}
                board={editingBoard}
                allStocks={stocksWithPrices}
                onSave={handleSaveBoard}
            />
        </div>
    );
}
