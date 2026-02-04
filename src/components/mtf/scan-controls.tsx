import { Loader2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

interface ScanProgressProps {
  isScanning: boolean
  progress: {
    completedIntervals: number
    totalIntervals: number
    currentSymbol: string
    currentInterval: string
  }
  progressPercent: number
}

export function ScanProgress({ isScanning, progress, progressPercent }: ScanProgressProps) {
  if (!isScanning) {
    return null
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Scanning {progress.currentSymbol} ({progress.currentInterval})
        </span>
        <span className="font-medium">
          {progress.completedIntervals}/{progress.totalIntervals}
        </span>
      </div>
      <Progress value={progressPercent} className="h-2" />
    </div>
  )
}

interface ScanButtonProps {
  isScanning: boolean
  activeIntervals: string[]
  onScan: () => void
}

export function ScanButton({ isScanning, activeIntervals, onScan }: ScanButtonProps) {
  return (
    <Button
      onClick={onScan}
      disabled={isScanning}
      size="lg"
      className="w-full sm:w-auto bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
    >
      {isScanning ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Scanning {activeIntervals.length} timeframes...
        </>
      ) : (
        <>
          <Zap className="h-4 w-4 mr-2" />
          Run MTF Scan ({activeIntervals.length} intervals)
        </>
      )}
    </Button>
  )
}
