import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Unlock } from 'lucide-react'

const STATUS_CONFIG = {
  draft: { label: 'Draft', variant: 'secondary' },
  submitted: { label: 'Submitted', variant: 'warning' },
  returned: { label: 'Returned', variant: 'destructive' },
  approved: { label: 'Approved', variant: 'success' },
  locked: { label: 'Locked', variant: 'success' },
}

export default function AdminGoalSheets() {
  const [sheets, setSheets] = useState([])
  const [loading, setLoading] = useState(true)
  const [unlockTarget, setUnlockTarget] = useState(null)
  const [reason, setReason] = useState('')
  const [toast, setToast] = useState(null)
  const [filter, setFilter] = useState({ status: '', department: '' })

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function loadSheets() {
    const params = new URLSearchParams()
    if (filter.status) params.append('status', filter.status)
    if (filter.department) params.append('department', filter.department)
    try {
      const { data } = await api.get(`/api/admin/goal-sheets?${params}`)
      setSheets(data)
    } catch (e) {
      showToast('Failed to load sheets', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSheets() }, [filter])

  async function handleUnlock() {
    if (!reason.trim()) { showToast('Reason is required', 'error'); return }
    try {
      await api.post(`/api/admin/goal-sheets/${unlockTarget.id}/unlock`, { reason })
      showToast('Sheet unlocked')
      setUnlockTarget(null)
      setReason('')
      loadSheets()
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed', 'error')
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-md text-sm shadow-lg ${
          toast.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-green-100 text-green-800 border border-green-200'
        }`}>{toast.msg}</div>
      )}

      <h1 className="text-2xl font-bold">All Goal Sheets</h1>

      <div className="flex gap-4">
        <div className="space-y-1">
          <Label>Filter by Status</Label>
          <select className="border rounded-md px-3 py-2 text-sm" value={filter.status}
            onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="returned">Returned</option>
            <option value="locked">Locked</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label>Filter by Department</Label>
          <Input placeholder="Engineering, HR…" value={filter.department}
            onChange={e => setFilter(f => ({ ...f, department: e.target.value }))} className="w-44" />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{[1,2,3,4].map(i=><Skeleton key={i} className="h-12 w-full"/>)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Approved</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sheets.map(s => {
                  const profile = s.profiles || {}
                  const statusInfo = STATUS_CONFIG[s.status] || STATUS_CONFIG.draft
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <p className="font-medium">{profile.full_name || '—'}</p>
                        <p className="text-xs text-muted-foreground">{profile.email}</p>
                      </TableCell>
                      <TableCell className="text-sm">{profile.department || '—'}</TableCell>
                      <TableCell><Badge variant={statusInfo.variant}>{statusInfo.label}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s.approved_at ? new Date(s.approved_at).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {['locked', 'approved'].includes(s.status) && (
                          <Button size="sm" variant="outline" className="gap-1"
                            onClick={() => { setUnlockTarget(s); setReason('') }}>
                            <Unlock className="h-3 w-3" /> Unlock
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!unlockTarget} onOpenChange={() => setUnlockTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlock Goal Sheet</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This will reset the sheet to draft status, allowing the employee to edit their goals again. This action is audit logged.
            </p>
            <div className="space-y-1">
              <Label>Reason (required)</Label>
              <Textarea placeholder="e.g. Employee requested change to goal target due to restructuring"
                value={reason} onChange={e => setReason(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlockTarget(null)}>Cancel</Button>
            <Button onClick={handleUnlock} className="bg-amber-600 hover:bg-amber-700">Unlock Sheet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
