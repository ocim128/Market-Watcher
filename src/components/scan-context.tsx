/**
 * Scan Context - DEPRECATED
 *
 * This file is kept for backwards compatibility.
 * All functionality has been migrated to Zustand.
 *
 * Import from '@/features/scan' instead:
 * ```typescript
 * import { useScan } from '@/features/scan'
 * ```
 *
 * @deprecated Use '@/features/scan' instead
 */

import React from 'react'
import {
  useScan as useScanNew,
  type ScanResult as ScanResultNew,
  type ScanOptions,
} from '@/features/scan'

// Re-export types for backwards compatibility
export type ScanResult = ScanResultNew
export type { ScanOptions }

// Re-export ScanProvider as a no-op wrapper
// This allows gradual migration - existing code continues to work
export function ScanProvider({ children }: { children: React.ReactNode }) {
  // Provider is no longer needed with Zustand
  // This is just a pass-through for backwards compatibility
  return <>{children}</>
}

// Re-export useScan hook
// This maintains the same API for existing code
export function useScan() {
  return useScanNew()
}

// Log deprecation warning in development
if (process.env.NODE_ENV === 'development') {
  console.info(
    '[DEPRECATED] scan-context.tsx is deprecated. ' +
      'Import useScan from "@/features/scan" instead.'
  )
}
