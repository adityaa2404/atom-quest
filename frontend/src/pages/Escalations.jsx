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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { AlertTriangle, Play, CheckCircle, XCircle } from 'lucide-react'

const LEVEL_CONFIG = {
  1: { label: 'L1', variant: 'warning' },
  2: { label: 'L2', variant: 'warning' },
  3: { label: 'L3 Critical', variant: 'destructive' },
}

const CONDITION_LABELS = {
  goal_not_submitted: 'Goal Not Submitted',
  goal_not_approved: 'Goal Not Approved',
  checkin_not_completed: 'Check-in Not Completed',
}

export default function Escalations() {
  const [summary, setSummary] = useState(null)
  const [rules, setRules] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [toast, setToast] = useState(null)
  const [logFilter, setLogFilter] = useState({ status: '', level: '' })
  const [resolveTarget, setResolveTarget] = useState(null)
  const [resolveNotes, setResolveNotes] = useState('')
  const [ruleForm, setRuleForm] = useState({
    condition_type: 'goal_not_submitted',
    threshold_days: 7,
    level_2_after_days: 3,
    level_3_after_days: 3,
  })

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  async function loadAll() {
    const [sumR, rulesR, logsR] = await Promise.allSettled([
      api.get('/api/escalations/summary'),
      api.get('/api/escalations/rules'),
      api.get(`/api/escalations/logs?${new URLSearchParams(Object.fromEntries(Object.entries(logFilter).filter(([,v]) => v)))}`),
    ])
    if (sumR.status === 'fulfilled') setSummary(sumR.value.data)
    if (rulesR.status === 'fulfilled') setRules(rulesR.value.data)
    if (logsR.status === 'fulfilled') setLogs(logsR.value.data)
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [logFilter])

  async function handleRunCheck() {
    setRunning(true)
    try {
      const { data } = await api.post('/api/escalations/run-check')
      showToast(`Check complete: ${data.new_escalations} new, ${data.level_ups} level-ups, ${data.auto_resolved} auto-resolved`)
      loadAll()
    } catch (e) {
      showToast(e.response?.data?.detail || 'Failed to run check', 'error')
    } finally {
      setRunning(false)
    }
  }

  async function handleCreateRule(e) {
    e.preventDefault()
    try {
      await api.post('/api/escalations/rules', ruleForm)
      showToast('Rule created')
      loadAll()
      setRuleForm({ condition_type: 'goal_not_submitted', threshold_days: 7, level_2_after_days: 3, level_3_after_days: 3 })
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed', 'error')
    }
  }

  async function handleResolve() {
    if (!resolveNotes.trim()) { showToast('Notes required', 'error'); return }
    try {
      await api.put(`/api/escalations/logs/${resolveTarget.id}/resolve`, { notes: resolveNotes })
      showToast('Escalation resolved')
      setResolveTarget(null)
      setResolveNotes('')
      loadAll()
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed', 'error')
    }
  }

  async function handleDismiss(logId) {
    try {
      await api.put(`/api/escalations/logs/${logId}/dismiss`)
      showToast('Escalation dismissed')
      loadAll()
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed', 'error')
    }
  }

  function daysOpen(createdAt) {
    if (!createdAt) return '—'
    const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000)
    return `${diff}d`
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-md text-sm shadow-lg max-w-sm ${
          toast.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-green-100 text-green-800 border border-green-200'
        }`}>{toast.msg}</div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Escalations</h1>
        <Button onClick={handleRunCheck} disabled={running} className="gap-2">
          <Play className="h-4 w-4" />
          {running ? 'Running…' : 'Run Escalation Check'}
        </Button>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Open Escalations', value: summary?.open || 0, icon: AlertTriangle, color: 'text-amber-600' },
            { label: 'Level 3 Critical', value: summary?.level_3_critical || 0, icon: AlertTriangle, color: 'text-red-600' },
            { label: 'Resolved This Week', value: summary?.resolved_this_week || 0, icon: CheckCircle, color: 'text-green-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="pt-6 flex items-start justify-between">
                <div>
                  <p className="text-3xl font-bold">{value}</p>
                  <p className="text-sm text-muted-foreground">{label}</p>
                </div>
                <Icon className={`h-6 w-6 ${color}`} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Escalation Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Escalation Logs</CardTitle>
            <div className="flex gap-3">
              <select className="border rounded-md px-3 py-1.5 text-sm" value={logFilter.status}
                onChange={e => setLogFilter(f => ({ ...f, status: e.target.value }))}>
                <option value="">All Statuses</option>
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
              <select className="border rounded-md px-3 py-1.5 text-sm" value={logFilter.level}
                onChange={e => setLogFilter(f => ({ ...f, level: e.target.value }))}>
                <option value="">All Levels</option>
                <option value="1">Level 1</option>
                <option value="2">Level 2</option>
                <option value="3">Level 3</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No escalations found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Rule / Condition</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Days Open</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(log => {
                  const lvl = LEVEL_CONFIG[log.current_level] || LEVEL_CONFIG[1]
                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{log.profiles?.full_name || log.employee_id?.slice(0, 8) + '…'}</p>
                        <p className="text-xs text-muted-foreground">{log.profiles?.department || ''}</p>
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.escalation_rules?.condition_type
                          ? CONDITION_LABELS[log.escalation_rules.condition_type] || log.escalation_rules.condition_type
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={lvl.variant}>{lvl.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{daysOpen(log.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant={log.status === 'resolved' ? 'success' : log.status === 'dismissed' ? 'secondary' : 'warning'}>
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {log.status === 'open' && (
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" variant="outline" className="gap-1 text-green-700 border-green-300 hover:bg-green-50"
                              onClick={() => { setResolveTarget(log); setResolveNotes('') }}>
                              <CheckCircle className="h-3 w-3" /> Resolve
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1 text-muted-foreground"
                              onClick={() => handleDismiss(log.id)}>
                              <XCircle className="h-3 w-3" /> Dismiss
                            </Button>
                          </div>
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

      {/* Rules Management */}
      <Card>
        <CardHeader><CardTitle>Escalation Rules</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Condition</TableHead>
                <TableHead>Threshold (days)</TableHead>
                <TableHead>Escalate to L2 after</TableHead>
                <TableHead>Escalate to L3 after</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map(rule => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium text-sm">{CONDITION_LABELS[rule.condition_type] || rule.condition_type}</TableCell>
                  <TableCell className="text-sm">{rule.threshold_days}d</TableCell>
                  <TableCell className="text-sm">+{rule.level_2_after_days}d</TableCell>
                  <TableCell className="text-sm">+{rule.level_3_after_days}d</TableCell>
                  <TableCell>
                    <Badge variant={rule.is_active ? 'success' : 'secondary'}>{rule.is_active ? 'Active' : 'Inactive'}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {rules.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No rules configured.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Add Escalation Rule</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleCreateRule} className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label>Condition Type</Label>
              <Select value={ruleForm.condition_type}
                onValueChange={v => setRuleForm(f => ({ ...f, condition_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="goal_not_submitted">Goal Not Submitted</SelectItem>
                  <SelectItem value="goal_not_approved">Goal Not Approved</SelectItem>
                  <SelectItem value="checkin_not_completed">Check-in Not Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Trigger after (days)</Label>
              <Input type="number" min={1} value={ruleForm.threshold_days}
                onChange={e => setRuleForm(f => ({ ...f, threshold_days: parseInt(e.target.value) }))} />
            </div>
            <div className="space-y-1">
              <Label>Escalate to L2 after (days)</Label>
              <Input type="number" min={1} value={ruleForm.level_2_after_days}
                onChange={e => setRuleForm(f => ({ ...f, level_2_after_days: parseInt(e.target.value) }))} />
            </div>
            <div className="space-y-1">
              <Label>Escalate to L3 after (days)</Label>
              <Input type="number" min={1} value={ruleForm.level_3_after_days}
                onChange={e => setRuleForm(f => ({ ...f, level_3_after_days: parseInt(e.target.value) }))} />
            </div>
            <div className="col-span-2">
              <Button type="submit">Create Rule</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Resolve Dialog */}
      <Dialog open={!!resolveTarget} onOpenChange={() => setResolveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Escalation</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Resolving escalation for <strong>{resolveTarget?.profiles?.full_name}</strong>.
              Please provide resolution notes.
            </p>
            <div className="space-y-1">
              <Label>Resolution Notes (required)</Label>
              <Textarea placeholder="Describe how this was resolved…"
                value={resolveNotes} onChange={e => setResolveNotes(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveTarget(null)}>Cancel</Button>
            <Button onClick={handleResolve} className="bg-green-600 hover:bg-green-700">Mark Resolved</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
