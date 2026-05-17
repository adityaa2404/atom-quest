import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const ACTION_COLORS = {
  edit: 'warning', approve: 'success', return: 'destructive',
  unlock: 'info', delete: 'destructive', push_shared: 'info',
  submit: 'secondary', manager_edit: 'warning',
}

export default function AuditTrail() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ entity_type: '', action: '' })

  useEffect(() => {
    const params = new URLSearchParams()
    if (filter.entity_type) params.append('entity_type', filter.entity_type)
    if (filter.action) params.append('action', filter.action)
    api.get(`/api/admin/audit-logs?${params}`)
      .then(({ data }) => setLogs(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filter])

  return (
    <div className="space-y-6 max-w-7xl">
      <h1 className="text-2xl font-bold">Audit Trail</h1>

      <div className="flex gap-4">
        <div className="space-y-1">
          <Label>Entity Type</Label>
          <Input placeholder="goal, goal_sheet…" className="w-40" value={filter.entity_type}
            onChange={e => setFilter(f => ({ ...f, entity_type: e.target.value }))} />
        </div>
        <div className="space-y-1">
          <Label>Action</Label>
          <Input placeholder="edit, approve, unlock…" className="w-40" value={filter.action}
            onChange={e => setFilter(f => ({ ...f, action: e.target.value }))} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{[1,2,3,4,5].map(i=><Skeleton key={i} className="h-12 w-full"/>)}</div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No audit logs found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity Type</TableHead>
                  <TableHead>Old Values</TableHead>
                  <TableHead>New Values</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.profiles?.full_name || log.changed_by?.slice(0, 8) + '…'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ACTION_COLORS[log.action] || 'secondary'}>{log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{log.entity_type}</TableCell>
                    <TableCell className="text-xs font-mono max-w-xs truncate">
                      {log.old_values ? JSON.stringify(log.old_values) : '—'}
                    </TableCell>
                    <TableCell className="text-xs font-mono max-w-xs truncate">
                      {log.new_values ? JSON.stringify(log.new_values) : '—'}
                    </TableCell>
                    <TableCell className="text-sm max-w-xs truncate">{log.reason || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
