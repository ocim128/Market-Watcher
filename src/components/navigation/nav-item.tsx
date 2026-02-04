'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface NavItemProps {
  href: string
  label: string
  icon: LucideIcon
  isCollapsed?: boolean
}

export function NavItem({ href, label, icon: Icon, isCollapsed = false }: NavItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 transition-all',
        'hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground'
      )}
      title={isCollapsed ? label : undefined}
    >
      <Icon className={cn('h-5 w-5 flex-shrink-0', isActive && 'text-primary')} />
      {!isCollapsed && <span className="text-sm">{label}</span>}
    </Link>
  )
}
