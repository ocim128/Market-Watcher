import type { Metadata } from 'next'
import { MtfAnalysis } from '@/components/mtf'

export const metadata: Metadata = {
  title: 'Multi-Timeframe Confluence | Market Watcher',
  description:
    'Analyze pair trading correlations across multiple timeframes for high-confidence signals',
}

export default function MtfPage() {
  return <MtfAnalysis />
}
