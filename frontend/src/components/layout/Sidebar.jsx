import { NavLink } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Target, CheckSquare, BarChart2,
  AlertTriangle, Settings, Users, FileSpreadsheet,
} from 'lucide-react'

const NAV_ITEMS = {
  employee: [
    { to: '/employee', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/goals', icon: Target, label: 'My Goals' },
    { to: '/checkin', icon: CheckSquare, label: 'Achievements' },
  ],
  manager: [
    { to: '/manager', icon: LayoutDashboard, label: 'Team Dashboard' },
    { to: '/manager/checkins', icon: CheckSquare, label: 'Check-ins' },
    { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  ],
  admin: [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/goal-sheets', icon: Target, label: 'Goal Sheets' },
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/analytics', icon: BarChart2, label: 'Analytics' },
    { to: '/escalations', icon: AlertTriangle, label: 'Escalations' },
    { to: '/admin/audit', icon: FileSpreadsheet, label: 'Audit Trail' },
  ],
}

export default function Sidebar() {
  const { effectiveRole } = useAuth()
  const items = NAV_ITEMS[effectiveRole] || []

  return (
    <aside className="w-56 border-r bg-white flex flex-col shrink-0">
      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/employee' || to === '/manager' || to === '/admin'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
