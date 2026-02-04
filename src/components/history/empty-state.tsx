'use client'

import { History, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export function EmptyState() {
  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <History className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-lg">Historical Tracking</CardTitle>
            <CardDescription>Track opportunities over time</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 bg-blue-500/10 rounded-full border border-blue-500/20 mb-4">
            <Clock className="h-8 w-8 text-blue-400" />
          </div>
          <h3 className="font-semibold text-lg mb-2">No History Yet</h3>
          <p className="text-muted-foreground text-sm max-w-md">
            Complete scans will be automatically saved to track opportunity trends over time. Check
            back after running a few scans!
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
