"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

const EXCHANGES = ["Tất cả", "HOSE", "HNX", "UPCOM"] as const;

interface StockFiltersProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    selectedExchange: string;
    onExchangeChange: (exchange: string) => void;
}

export function StockFilters({
    searchQuery,
    onSearchChange,
    selectedExchange,
    onExchangeChange,
}: StockFiltersProps) {
    return (
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-1">
                {/* Search */}
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Tìm mã CK, tên công ty..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-9 bg-muted/50 border-border/50 focus:bg-background transition-colors"
                    />
                </div>
            </div>

            {/* Exchange tabs */}
            <div className="flex gap-1 bg-muted/50 p-1 rounded-lg self-start lg:self-center shrink-0">
                {EXCHANGES.map((ex) => (
                    <Button
                        key={ex}
                        variant={selectedExchange === ex ? "default" : "ghost"}
                        size="sm"
                        onClick={() => onExchangeChange(ex)}
                        className={
                            selectedExchange === ex
                                ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25 h-7 text-xs"
                                : "text-muted-foreground h-7 text-xs hover:text-foreground"
                        }
                    >
                        {ex}
                    </Button>
                ))}
            </div>
        </div>
    );
}
