"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LogIn, Mail, Lock, ChromeIcon as Google, TrendingUp, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const supabase = createClient();

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
                });
                if (error) throw error;
                toast.success("Kiểm tra email để xác nhận tài khoản!");
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                toast.success("Đăng nhập thành công!");
                window.location.href = "/";
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Có lỗi xảy ra";
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) toast.error(error.message);
    };

    return (
        <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4">
            <Card className="w-full max-w-md p-8 space-y-6 bg-card/50 backdrop-blur-xl border-border/50">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 mx-auto shadow-lg shadow-emerald-500/25">
                        <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold">
                        {isSignUp ? "Tạo tài khoản" : "Đăng nhập"}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {isSignUp
                            ? "Đăng ký để sử dụng Watchlist và các tính năng nâng cao"
                            : "Đăng nhập để quản lý Watchlist cá nhân"}
                    </p>
                </div>

                {/* Google */}
                <Button
                    variant="outline"
                    className="w-full h-11"
                    onClick={handleGoogleLogin}
                >
                    <Google className="h-4 w-4 mr-2" />
                    Tiếp tục với Google
                </Button>

                <div className="relative">
                    <Separator />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                        hoặc
                    </span>
                </div>

                {/* Email form */}
                <form onSubmit={handleEmailAuth} className="space-y-4">
                    <div className="space-y-2">
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-9 h-11"
                                required
                            />
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="password"
                                placeholder="Mật khẩu"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-9 h-11"
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-11 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all"
                        disabled={loading}
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <LogIn className="h-4 w-4 mr-2" />
                        )}
                        {isSignUp ? "Đăng ký" : "Đăng nhập"}
                    </Button>
                </form>

                <p className="text-center text-sm text-muted-foreground">
                    {isSignUp ? "Đã có tài khoản?" : "Chưa có tài khoản?"}{" "}
                    <button
                        type="button"
                        className="text-emerald-500 hover:underline font-medium"
                        onClick={() => setIsSignUp(!isSignUp)}
                    >
                        {isSignUp ? "Đăng nhập" : "Đăng ký"}
                    </button>
                </p>

                <Link href="/" className="block text-center text-xs text-muted-foreground hover:text-foreground">
                    ← Quay lại bảng giá
                </Link>
            </Card>
        </div>
    );
}
