"use client";

import Link from "next/link";
import { Moon, Sun, TrendingUp, Star, LogIn, LogOut, User, LayoutGrid } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export function Navbar() {
    const { setTheme, theme } = useTheme();
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [mounted, setMounted] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        setMounted(true);
        supabase.auth.getUser().then(({ data }) => setUser(data.user));
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });
        return () => subscription.unsubscribe();
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center px-4 md:px-6">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 mr-6">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-500/25">
                        <TrendingUp className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold text-lg bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                        VNStock Live
                    </span>
                </Link>

                {/* Nav links */}
                <nav className="hidden md:flex items-center gap-1 flex-1">
                    <Link href="/">
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                            <TrendingUp className="h-4 w-4 mr-1" />
                            Bảng giá
                        </Button>
                    </Link>
                    <Link href="/heatmap">
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                            <LayoutGrid className="h-4 w-4 mr-1" />
                            Heatmap
                        </Button>
                    </Link>
                    {user && (
                        <Link href="/watchlist">
                            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                                <Star className="h-4 w-4 mr-1" />
                                Watchlist
                            </Button>
                        </Link>
                    )}
                </nav>

                {/* Right side */}
                <div className="flex items-center gap-2 ml-auto">
                    {/* Theme toggle */}
                    {mounted && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        >
                            {theme === "dark" ? (
                                <Sun className="h-4 w-4" />
                            ) : (
                                <Moon className="h-4 w-4" />
                            )}
                        </Button>
                    )}

                    {/* Auth */}
                    {user ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9">
                                    <User className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem className="text-xs text-muted-foreground">
                                    {user.email}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleSignOut}>
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Đăng xuất
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <Link href="/auth/login">
                            <Button size="sm" className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white border-0 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all">
                                <LogIn className="h-4 w-4 mr-1" />
                                Đăng nhập
                            </Button>
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}
