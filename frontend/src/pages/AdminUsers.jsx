import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const ROLE_COLORS = { employee: 'info', manager: 'warning', admin: 'success' }

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ id: '', email: '', full_name: '', role: 'employee', department: '', manager_id: '' })
  const [toast, setToast] = useState(null)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function loadUsers() {
    try {
      const { data } = await api.get('/api/admin/users')
      setUsers(data)
    } catch (e) {
      showToast('Failed to load users', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [])

  async function handleCreate(e) {
    e.preventDefault()
    try {
      const payload = { ...form }
      if (!payload.manager_id) delete payload.manager_id
      await api.post('/api/admin/users', payload)
      showToast('User profile created')
      loadUsers()
      setForm({ id: '', email: '', full_name: '', role: 'employee', department: '', manager_id: '' })
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed to create user', 'error')
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-md text-sm shadow-lg ${
          toast.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-green-100 text-green-800 border border-green-200'
        }`}>{toast.msg}</div>
      )}

      <h1 className="text-2xl font-bold">User Management</h1>

      <Card>
        <CardHeader><CardTitle>All Profiles ({users.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{[1,2,3].map(i=><Skeleton key={i} className="h-12 w-full"/>)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell className="text-sm">{u.email}</TableCell>
                    <TableCell><Badge variant={ROLE_COLORS[u.role] || 'secondary'}>{u.role}</Badge></TableCell>
                    <TableCell className="text-sm">{u.department || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Create Profile</CardTitle>
          <p className="text-sm text-muted-foreground">First create the user in Supabase Auth, then add their profile here with the auth UUID.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label>Auth UUID (from Supabase Auth → Users)</Label>
              <Input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" value={form.id}
                onChange={e => setForm(f => ({ ...f, id: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Department</Label>
              <Input placeholder="Engineering, HR, Sales…" value={form.department}
                onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Manager ID (UUID of manager profile, if applicable)</Label>
              <Select value={form.manager_id || 'none'} onValueChange={v => setForm(f => ({ ...f, manager_id: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Select manager (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No manager</SelectItem>
                  {users.filter(u => u.role === 'manager').map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Button type="submit">Create Profile</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
