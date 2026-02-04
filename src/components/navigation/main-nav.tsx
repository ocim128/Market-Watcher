'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Layers, History, Settings, Menu, X, Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/mtf', label: 'Multi-Timeframe', icon: Layers },
  { href: '/history', label: 'History', icon: History },
]

interface NavItemProps {
  href: string
  label: string
  icon: React.ElementType
  onClick?: () => void
}

function NavItem({ href, label, icon: Icon, onClick }: NavItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== '/' && pathname?.startsWith(href))

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all',
        'hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground'
      )}
    >
      <Icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-primary')} />
      <span className="text-sm">{label}</span>
    </Link>
  )
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="hover:bg-primary/10 hover:text-primary"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}

interface MainNavProps {
  className?: string
}

export function MainNav({ className }: MainNavProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <>
      {/* Desktop Sidebar */}
      <nav
        className={cn(
          'hidden md:flex flex-col gap-1 w-64 h-screen sticky top-0',
          'border-r border-border/40 bg-card/50 backdrop-blur-sm',
          'p-4',
          className
        )}
      >
        <div className="flex items-center gap-3 px-3 py-4 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
            <LayoutDashboard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Market Watcher</h1>
            <p className="text-xs text-muted-foreground">Pair Trading Dashboard</p>
          </div>
        </div>

        <div className="flex flex-col gap-1 flex-1">
          {navItems.map(item => (
            <NavItem key={item.href} {...item} />
          ))}
        </div>

        <div className="pt-4 border-t border-border/40 space-y-1">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
          <NavItem href="#" label="Settings" icon={Settings} />
        </div>
      </nav>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-lg border border-primary/20">
              <LayoutDashboard className="h-4 w-4 text-primary" />
            </div>
            <span className="font-bold">Market Watcher</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="h-9 w-9"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 border-b border-border/40 bg-background/95 backdrop-blur-xl p-4 shadow-lg">
            <nav className="flex flex-col gap-1">
              {navItems.map(item => (
                <NavItem key={item.href} {...item} onClick={() => setIsMobileMenuOpen(false)} />
              ))}
              <div className="my-2 border-t border-border/40" />
              <NavItem href="#" label="Settings" icon={Settings} />
            </nav>
          </div>
        )}
      </div>
    </>
  )
}
