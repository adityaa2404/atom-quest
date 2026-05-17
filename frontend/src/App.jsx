import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Skeleton } from '@/components/ui/skeleton'
import Layout from '@/components/layout/Layout'

import Login from '@/pages/Login'
import EmployeeDashboard from '@/pages/EmployeeDashboard'
import ManagerDashboard from '@/pages/ManagerDashboard'
import AdminDashboard from '@/pages/AdminDashboard'
import GoalSheet from '@/pages/GoalSheet'
import CheckIn from '@/pages/CheckIn'
import Analytics from '@/pages/Analytics'
import Escalations from '@/pages/Escalations'
import ManagerCheckins from '@/pages/ManagerCheckins'
import AdminGoalSheets from '@/pages/AdminGoalSheets'
import AdminUsers from '@/pages/AdminUsers'
import AuditTrail from '@/pages/AuditTrail'

function AuthRoot() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="space-y-3 w-64">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  )
}

function ProtectedRoute({ children, allowedRoles }) {
  const { session, effectiveRole, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace />
  if (!effectiveRole) return <LoadingScreen />

  if (effectiveRole === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3 max-w-sm">
          <div className="text-4xl">⏳</div>
          <h2 className="text-xl font-semibold">Account pending setup</h2>
          <p className="text-muted-foreground text-sm">An admin needs to assign your role before you can access the portal.</p>
          <button className="text-sm text-primary underline" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </div>
    )
  }

  if (allowedRoles && !allowedRoles.includes(effectiveRole)) {
    if (effectiveRole === 'admin') return <Navigate to="/admin" replace />
    if (effectiveRole === 'manager') return <Navigate to="/manager" replace />
    return <Navigate to="/employee" replace />
  }

  return <Layout>{children}</Layout>
}

function RootRedirect() {
  const { session, effectiveRole, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace />
  if (!effectiveRole) return <LoadingScreen />

  if (effectiveRole === 'admin') return <Navigate to="/admin" replace />
  if (effectiveRole === 'manager') return <Navigate to="/manager" replace />
  if (effectiveRole === 'employee') return <Navigate to="/employee" replace />
  return <Navigate to="/login" replace />
}

const router = createBrowserRouter([
  {
    element: <AuthRoot />,
    children: [
      { path: '/login', element: <Login /> },
      { path: '/', element: <RootRedirect /> },
      { path: '/employee', element: <ProtectedRoute allowedRoles={['employee', 'manager', 'admin']}><EmployeeDashboard /></ProtectedRoute> },
      { path: '/goals', element: <ProtectedRoute allowedRoles={['employee', 'manager', 'admin']}><GoalSheet /></ProtectedRoute> },
      { path: '/goals/:sheetId', element: <ProtectedRoute allowedRoles={['employee', 'manager', 'admin']}><GoalSheet /></ProtectedRoute> },
      { path: '/checkin', element: <ProtectedRoute allowedRoles={['employee', 'manager', 'admin']}><CheckIn /></ProtectedRoute> },
      { path: '/manager', element: <ProtectedRoute allowedRoles={['manager', 'admin']}><ManagerDashboard /></ProtectedRoute> },
      { path: '/manager/checkins', element: <ProtectedRoute allowedRoles={['manager', 'admin']}><ManagerCheckins /></ProtectedRoute> },
      { path: '/manager/review/:sheetId', element: <ProtectedRoute allowedRoles={['manager', 'admin']}><GoalSheet reviewMode /></ProtectedRoute> },
      { path: '/manager/checkin/:employeeId', element: <ProtectedRoute allowedRoles={['manager', 'admin']}><CheckIn /></ProtectedRoute> },
      { path: '/admin', element: <ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute> },
      { path: '/admin/goal-sheets', element: <ProtectedRoute allowedRoles={['admin']}><AdminGoalSheets /></ProtectedRoute> },
      { path: '/admin/users', element: <ProtectedRoute allowedRoles={['admin']}><AdminUsers /></ProtectedRoute> },
      { path: '/admin/audit', element: <ProtectedRoute allowedRoles={['admin']}><AuditTrail /></ProtectedRoute> },
      { path: '/analytics', element: <ProtectedRoute allowedRoles={['manager', 'admin']}><Analytics /></ProtectedRoute> },
      { path: '/escalations', element: <ProtectedRoute allowedRoles={['admin']}><Escalations /></ProtectedRoute> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
