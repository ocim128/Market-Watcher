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
            <body className={inter.className}>
                <Providers>
                    <div className="min-h-screen bg-background">
                        {children}
                    </div>
                </Providers>
            </body>
        </html>
    )
}
