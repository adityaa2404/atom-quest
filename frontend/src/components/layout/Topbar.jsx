import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, User } from 'lucide-react'

const ROLE_LABELS = {
  employee: 'Employee',
  manager: 'Manager',
  admin: 'Admin / HR',
}

const ROLE_VARIANTS = {
  employee: 'secondary',
  manager: 'warning',
  admin: 'success',
}

export default function Topbar() {
  const { profile, effectiveRole, logout } = useAuth()

  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2">
        <span className="font-bold text-lg text-primary">AtomQuest</span>
        <span className="text-muted-foreground text-sm">Goal Portal</span>
      </div>

      <div className="flex items-center gap-3">
        <Badge variant={ROLE_VARIANTS[effectiveRole] || 'secondary'}>
          {ROLE_LABELS[effectiveRole] || effectiveRole}
        </Badge>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <User className="h-4 w-4" />
              <span className="text-sm">{ROLE_LABELS[effectiveRole] || effectiveRole}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{profile?.full_name}</DropdownMenuLabel>
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal -mt-2">{profile?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-red-600 gap-2">
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
