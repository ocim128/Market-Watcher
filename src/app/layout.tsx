import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
    title: "Market Watcher | Pair Trading Dashboard",
    description:
        "Discover mean-reverting pair trading opportunities on Binance with real-time correlation analysis",
    keywords: ["trading", "binance", "pair trading", "correlation", "crypto"],
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${inter.className} antialiased relative`}>
                <Providers>
                    <div className="fixed inset-0 z-[-1] bg-background">
                        <div className="absolute top-0 left-0 right-0 h-[500px] bg-purple-500/10 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />
                        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full mix-blend-screen pointer-events-none" />
                    </div>
                    <div className="min-h-screen">
                        {children}
                    </div>
                </Providers>
            </body>
        </html>
    )
}
