import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Header } from './header'

// Mock the hooks
const mockScan = vi.fn()
const mockSetCurrentPrimaryPair = vi.fn()
const mockSetTheme = vi.fn()

vi.mock('@/components/scan-context', () => ({
  useScan: () => ({
    scan: mockScan,
    isScanning: false,
    lastScanTime: null,
    setCurrentPrimaryPair: mockSetCurrentPrimaryPair,
  }),
}))

vi.mock('@/hooks/use-auto-refresh', () => ({
  useAutoRefresh: () => ({
    isAutoRefreshEnabled: false,
    formatNextRefresh: () => '05:00',
    nextRefreshIn: 300,
  }),
}))

vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'dark',
    setTheme: mockSetTheme,
  }),
}))

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the app title', () => {
    render(<Header />)
    expect(screen.getByText('Market Watcher')).toBeInTheDocument()
  })

  it('renders "Live Monitor" status', () => {
    render(<Header />)
    expect(screen.getByText('Live Monitor')).toBeInTheDocument()
  })

  it('renders system active indicator', () => {
    render(<Header />)
    expect(screen.getByText('System Active')).toBeInTheDocument()
  })

  it('renders scan button', () => {
    render(<Header />)
    expect(screen.getByRole('button', { name: /scan/i })).toBeInTheDocument()
  })

  it('renders settings button', () => {
    render(<Header />)
    expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument()
  })

  it('renders theme toggle button', () => {
    render(<Header />)
    expect(screen.getByRole('button', { name: /toggle theme/i })).toBeInTheDocument()
  })

  it('calls scan function when scan button is clicked', () => {
    render(<Header />)
    fireEvent.click(screen.getByRole('button', { name: /scan/i }))
    expect(mockScan).toHaveBeenCalledTimes(1)
  })

  it('toggles theme when theme button is clicked', () => {
    render(<Header />)
    fireEvent.click(screen.getByRole('button', { name: /toggle theme/i }))
    expect(mockSetTheme).toHaveBeenCalledWith('light')
  })

  it('displays default primary pair', () => {
    render(<Header />)
    // Should show ETH (default primary pair without USDT suffix)
    expect(screen.getByText('ETH')).toBeInTheDocument()
  })

  it('opens settings panel when settings button is clicked', async () => {
    render(<Header />)
    fireEvent.click(screen.getByRole('button', { name: /settings/i }))

    // Settings panel should be rendered - look for the Settings heading
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()

    // Should show scan parameters section
    expect(screen.getByRole('heading', { name: 'Scan Parameters' })).toBeInTheDocument()
  })
})
