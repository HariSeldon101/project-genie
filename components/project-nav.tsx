'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  FileText, 
  Settings, 
  Users,
  Sparkles,
  AlertCircle
} from 'lucide-react'

interface ProjectNavProps {
  projectId: string
}

export function ProjectNav({ projectId }: ProjectNavProps) {
  const pathname = usePathname()
  
  const navItems = [
    {
      href: `/projects/${projectId}`,
      label: 'Overview',
      icon: LayoutDashboard,
      exact: true
    },
    {
      href: `/projects/${projectId}/documents`,
      label: 'Documents',
      icon: FileText
    },
    {
      href: `/projects/${projectId}/generate`,
      label: 'Generate',
      icon: Sparkles
    },
    {
      href: `/projects/${projectId}/risks`,
      label: 'Risks',
      icon: AlertCircle
    },
    {
      href: `/projects/${projectId}/team`,
      label: 'Team',
      icon: Users
    },
    {
      href: `/projects/${projectId}/settings`,
      label: 'Settings',
      icon: Settings
    }
  ]
  
  return (
    <nav className="flex space-x-6 border-b mb-8">
      {navItems.map(item => {
        const isActive = item.exact 
          ? pathname === item.href
          : pathname.startsWith(item.href)
        const Icon = item.icon
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2 px-3 py-4 text-sm font-medium border-b-2 -mb-px transition-colors',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}