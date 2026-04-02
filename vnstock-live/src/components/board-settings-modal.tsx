"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, X, Check, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Stock, DashboardBoard } from "@/lib/types";

interface BoardSettingsModalProps {
    open: boolean;
    onClose: () => void;
    board: DashboardBoard | null;
    allStocks: Stock[];
    onSave: (boardId: string, updates: Partial<DashboardBoard>) => void;
}

export function BoardSettingsModal({
    open,
    onClose,
    board,
    allStocks,
    onSave
}: BoardSettingsModalProps) {
    const [title, setTitle] = useState("");
    const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    // Sync state when board changes
    useMemo(() => {
        if (board) {
            setTitle(board.title);
            setSelectedSymbols(board.symbols);
        }
    }, [board]);

    const filteredStocks = useMemo(() => {
        if (!searchQuery) return allStocks.slice(0, 50); // Show first 50 as default
        const q = searchQuery.toLowerCase();
        return allStocks.filter(s =>
            s.symbol.toLowerCase().includes(q) ||
            s.name?.toLowerCase().includes(q)
        ).slice(0, 50);
    }, [allStocks, searchQuery]);

    const handleToggleStock = (symbol: string) => {
        setSelectedSymbols(prev =>
            prev.includes(symbol)
                ? prev.filter(s => s !== symbol)
                : [...prev, symbol]
        );
    };

    const handleSave = () => {
        if (board) {
            onSave(board.id, { title, symbols: selectedSymbols });
            onClose();
        }
    };

    if (!board) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] bg-[#0c0c0c] border-white/10 text-white shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-emerald-400 flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Cài đặt bảng
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Title Input */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Tên bảng</label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Nhập tên bảng..."
                            className="bg-white/5 border-white/10 focus:border-emerald-500/50 transition-colors h-11"
                        />
                    </div>

                    {/* Stock Selection */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Danh sách mã ({selectedSymbols.length})</label>
                            {selectedSymbols.length > 0 && (
                                <button
                                    onClick={() => setSelectedSymbols([])}
                                    className="text-[10px] text-red-400 hover:text-red-300 transition-colors"
                                >
                                    Xóa hết
                                </button>
                            )}
                        </div>

                        {/* Selected Tags */}
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                            {selectedSymbols.map(sym => (
                                <Badge
                                    key={sym}
                                    variant="secondary"
                                    className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1 px-2 py-0.5"
                                >
                                    {sym}
                                    <X
                                        className="h-3 w-3 cursor-pointer hover:text-white"
                                        onClick={() => handleToggleStock(sym)}
                                    />
                                </Badge>
                            ))}
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                            <Input
                                placeholder="Tìm mã chứng khoán (VD: HPG, FPT...)"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-white/5 border-white/10 h-10"
                            />
                        </div>

                        {/* Stock List Results */}
                        <div className="border border-white/5 rounded-lg overflow-hidden bg-black/40">
                            <ScrollArea className="h-[250px]">
                                <div className="p-1 space-y-0.5">
                                    {filteredStocks.map(stock => {
                                        const isSelected = selectedSymbols.includes(stock.symbol);
                                        return (
                                            <div
                                                key={stock.symbol}
                                                onClick={() => handleToggleStock(stock.symbol)}
                                                className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-all ${isSelected
                                                        ? "bg-emerald-500/20 text-emerald-400"
                                                        : "hover:bg-white/5 text-white/60 hover:text-white"
                                                    }`}
                                            >
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm">{stock.symbol}</span>
                                                    <span className="text-[10px] opacity-60 truncate max-w-[200px]">{stock.name}</span>
                                                </div>
                                                {isSelected && <Check className="h-4 w-4" />}
                                                {!isSelected && <span className="text-[10px] opacity-0 group-hover:opacity-100">+ Thêm</span>}
                                            </div>
                                        );
                                    })}
                                    {filteredStocks.length === 0 && (
                                        <div className="p-8 text-center text-xs text-white/20">
                                            Không tìm thấy mã phù hợp
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                </div>

                <DialogFooter className="border-t border-white/5 pt-4 gap-2">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="text-white/60 hover:text-white hover:bg-white/5"
                    >
                        Hủy
                    </Button>
                    <Button
                        onClick={handleSave}
                        className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-8"
                    >
                        Lưu thay đổi
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
