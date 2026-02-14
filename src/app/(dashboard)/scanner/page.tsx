import type { Metadata } from 'next'
import { ScannerPanel } from '@/components/scanner'

export const metadata: Metadata = {
  title: 'Momentum RSI Scanner | Market Watcher',
  description:
    'Scan high-momentum crypto pairs for RSI(14) oversold crossover alerts with local candle storage',
}

export default function ScannerPage() {
  return <ScannerPanel />
}
