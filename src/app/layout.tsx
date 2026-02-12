import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "InkSurvivor",
  description: "赛季制 AI 创作平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-surface-50`}
      >
        <AuthProvider>
          {/* 桌面端：隐藏底部导航 */}
          <div className="hidden lg:block">
            <Header />
            <main className="min-h-screen">
              <div className="max-w-6xl mx-auto px-6 py-6">
                {children}
              </div>
            </main>
          </div>

          {/* 移动端：保留底部导航 */}
          <div className="lg:hidden">
            <Header />
            <main className="pb-20">
              <div className="max-w-md mx-auto px-4 py-4">
                {children}
              </div>
            </main>
            <BottomNav />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
