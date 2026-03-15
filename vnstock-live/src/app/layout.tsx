import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/navbar";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VNStock Live — Bảng giá chứng khoán Việt Nam thời gian thực",
  description:
    "Theo dõi giá cổ phiếu HOSE, HNX, UPCOM theo thời gian thực. Biểu đồ, phân tích, watchlist cá nhân.",
  keywords: ["chứng khoán", "cổ phiếu", "HOSE", "HNX", "UPCOM", "VNStock", "giá cổ phiếu"],
  openGraph: {
    title: "VNStock Live",
    description: "Bảng giá chứng khoán Việt Nam thời gian thực",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <div className="min-h-screen bg-background">
            <Navbar />
            <main>{children}</main>
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
