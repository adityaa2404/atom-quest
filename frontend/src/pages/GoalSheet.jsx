import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useGoals } from '@/hooks/useGoals'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Trash2, Edit2, Lock, Share2, AlertTriangle } from 'lucide-react'

const UOM_OPTIONS = [
  { value: 'min_numeric', label: 'Numeric — Higher is better' },
  { value: 'max_numeric', label: 'Numeric — Lower is better' },
  { value: 'min_percent', label: 'Percentage — Higher is better' },
  { value: 'max_percent', label: 'Percentage — Lower is better' },
  { value: 'timeline', label: 'Timeline (date-based)' },
  { value: 'zero', label: 'Zero-based (zero = success)' },
]

const STATUS_CONFIG = {
  draft: { label: 'Draft', variant: 'secondary' },
  submitted: { label: 'Submitted — Pending Approval', variant: 'warning' },
  returned: { label: 'Returned for Rework', variant: 'destructive' },
  approved: { label: 'Approved', variant: 'success' },
  locked: { label: 'Approved & Locked', variant: 'success' },
}

function GoalForm({ initial, thrustAreas, onSave, onClose }) {
  const [form, setForm] = useState(initial || {
    title: '', description: '', thrust_area_id: '', uom_type: '',
    target_value: '', target_date: '', weightage: 10,
  })
  const [errors, setErrors] = useState({})

  function validate() {
    const errs = {}
    if (!form.title || form.title.trim().length < 5) errs.title = 'Title must be at least 5 characters'
    if (!form.uom_type) errs.uom_type = 'UoM type is required'
    if (!form.weightage || form.weightage < 10) errs.weightage = 'Minimum weightage is 10%'
    if (['min_numeric', 'max_numeric', 'min_percent', 'max_percent'].includes(form.uom_type) && !form.target_value)
      errs.target_value = 'Target value is required for this UoM type'
    if (form.uom_type === 'timeline' && !form.target_date)
      errs.target_date = 'Target date is required for timeline goals'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSave() {
    if (!validate()) return
    const payload = {
      title: form.title.trim(),
      description: form.description || null,
      thrust_area_id: form.thrust_area_id || null,
      uom_type: form.uom_type,
      target_value: form.target_value ? parseFloat(form.target_value) : null,
      target_date: form.target_date || null,
      weightage: parseInt(form.weightage),
    }
    onSave(payload)
  }

  const needsTarget = ['min_numeric', 'max_numeric', 'min_percent', 'max_percent'].includes(form.uom_type)
  const needsDate = form.uom_type === 'timeline'

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label>Title *</Label>
        <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="e.g. Increase quarterly revenue by 15%" />
        {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
      </div>
      <div className="space-y-1">
        <Label>Description</Label>
        <Textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Optional: describe how you'll achieve this goal" rows={2} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Thrust Area</Label>
          <Select value={form.thrust_area_id || ''} onValueChange={v => setForm(f => ({ ...f, thrust_area_id: v }))}>
            <SelectTrigger><SelectValue placeholder="Select area" /></SelectTrigger>
            <SelectContent>
              {thrustAreas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>UoM Type *</Label>
          <Select value={form.uom_type} onValueChange={v => setForm(f => ({ ...f, uom_type: v, target_value: '', target_date: '' }))}>
            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              {UOM_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {errors.uom_type && <p className="text-xs text-red-500">{errors.uom_type}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {needsTarget && (
          <div className="space-y-1">
            <Label>Target Value *</Label>
            <Input type="number" value={form.target_value} onChange={e => setForm(f => ({ ...f, target_value: e.target.value }))}
              placeholder={form.uom_type?.includes('percent') ? '0-100' : 'Enter target'} />
            {errors.target_value && <p className="text-xs text-red-500">{errors.target_value}</p>}
          </div>
        )}
        {needsDate && (
          <div className="space-y-1">
            <Label>Target Date *</Label>
            <Input type="date" value={form.target_date || ''} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} />
            {errors.target_date && <p className="text-xs text-red-500">{errors.target_date}</p>}
          </div>
        )}
        <div className="space-y-1">
          <Label>Weightage (%) *</Label>
          <Input type="number" min="10" max="100" value={form.weightage}
            onChange={e => setForm(f => ({ ...f, weightage: e.target.value }))} />
          {errors.weightage && <p className="text-xs text-red-500">{errors.weightage}</p>}
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave}>Save Goal</Button>
      </DialogFooter>
    </div>
  )
}

export default function GoalSheet({ reviewMode = false }) {
  const { sheetId } = useParams()
  const { effectiveRole } = useAuth()
  const { sheet, goals, loading, error, addGoal, editGoal, deleteGoal, submitSheet, refetch } = useGoals()
  const [thrustAreas, setThrustAreas] = useState([])
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)
  const [managerEditMode, setManagerEditMode] = useState(false)
  const [managerEdits, setManagerEdits] = useState({})

  const isManager = effectiveRole === 'manager' || effectiveRole === 'admin'
  const canEdit = !reviewMode && sheet && ['draft', 'returned'].includes(sheet.status)

  useEffect(() => {
    api.get('/api/goals/thrust-areas').then(({ data }) => setThrustAreas(data)).catch(() => {})
  }, [])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleAdd(goalData) {
    try {
      await addGoal(sheet.id, goalData)
      setAddOpen(false)
      showToast('Goal added')
    } catch (e) {
      showToast(e.response?.data?.detail || 'Failed to add goal', 'error')
    }
  }

  async function handleEdit(goalData) {
    try {
      await editGoal(editTarget.id, goalData)
      setEditTarget(null)
      showToast('Goal updated')
    } catch (e) {
      showToast(e.response?.data?.detail || 'Failed to update goal', 'error')
    }
  }

  async function handleDelete(goalId) {
    if (!confirm('Delete this goal?')) return
    try {
      await deleteGoal(goalId)
      showToast('Goal deleted')
    } catch (e) {
      showToast(e.response?.data?.detail || 'Failed to delete goal', 'error')
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      await submitSheet(sheet.id)
      showToast('Goal sheet submitted for approval!')
    } catch (e) {
      showToast(e.response?.data?.detail || 'Submission failed', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleManagerApprove() {
    try {
      await api.put(`/api/goals/sheets/${sheet.id}/approve`)
      await refetch()
      showToast('Goal sheet approved and locked!')
    } catch (e) {
      showToast(e.response?.data?.detail || 'Failed to approve', 'error')
    }
  }

  async function handleManagerReturn() {
    const comment = prompt('Return reason (required):')
    if (!comment?.trim()) return
    try {
      await api.put(`/api/goals/sheets/${sheet.id}/return`, { comment })
      await refetch()
      showToast('Sheet returned for rework')
    } catch (e) {
      showToast(e.response?.data?.detail || 'Failed to return', 'error')
    }
  }

  async function handleManagerSaveEdits() {
    // Validate total weightage before sending anything
    const newTotal = goals.reduce((sum, g) => {
      const edited = managerEdits[g.id]
      return sum + (edited?.weightage ?? g.weightage)
    }, 0)
    if (newTotal !== 100) {
      showToast(`Total weightage must equal 100% (currently ${newTotal}%)`, 'error')
      return
    }

    for (const [goalId, updates] of Object.entries(managerEdits)) {
      try {
        await api.put(`/api/goals/sheets/${sheet.id}/goals/${goalId}/manager-edit`, updates)
      } catch (e) {
        showToast(e.response?.data?.detail || 'Failed to save edits', 'error')
        return
      }
    }
    await refetch()
    setManagerEdits({})
    setManagerEditMode(false)
    showToast('Changes saved and audit logged')
  }

  const totalWeightage = goals.reduce((s, g) => s + (g.weightage || 0), 0)
  const weightageOk = totalWeightage === 100

  if (loading) return <div className="space-y-3"><div className="h-8 w-64 bg-muted animate-pulse rounded" /><div className="h-64 bg-muted animate-pulse rounded" /></div>
  if (error) return <div className="text-red-500">Error loading goal sheet: {error}</div>
  if (!sheet) return (
    <div className="text-center py-12 text-muted-foreground">
      <Target className="h-12 w-12 mx-auto mb-3 opacity-30" />
      <p>No goal sheet found. Go to your dashboard to start one.</p>
    </div>
  )

  const statusInfo = STATUS_CONFIG[sheet.status]

  return (
    <div className="space-y-6 max-w-5xl">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-md text-sm shadow-lg ${
          toast.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-green-100 text-green-800 border border-green-200'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Goal Sheet</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={statusInfo?.variant}>{statusInfo?.label}</Badge>
            {sheet.submitted_at && <span className="text-xs text-muted-foreground">Submitted {new Date(sheet.submitted_at).toLocaleDateString()}</span>}
          </div>
        </div>
        {isManager && reviewMode && sheet.status === 'submitted' && (
          <div className="flex items-center gap-2">
            {managerEditMode && (() => {
              const editedTotal = goals.reduce((sum, g) => sum + (managerEdits[g.id]?.weightage ?? g.weightage), 0)
              return (
                <span className={`text-sm font-medium ${editedTotal === 100 ? 'text-green-600' : 'text-red-600'}`}>
                  Total: {editedTotal}%
                </span>
              )
            })()}
            <Button variant="outline" onClick={() => { setManagerEditMode(!managerEditMode); setManagerEdits({}) }}>
              {managerEditMode ? 'Cancel Edit' : 'Edit Mode'}
            </Button>
            {managerEditMode && <Button onClick={handleManagerSaveEdits}>Save Edits</Button>}
            <Button variant="outline" className="text-red-600 border-red-300" onClick={handleManagerReturn}>Return</Button>
            <Button onClick={handleManagerApprove}>Approve & Lock</Button>
          </div>
        )}
      </div>

      {/* Return comment banner */}
      {sheet.status === 'returned' && sheet.return_comment && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-md p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-800">Manager's feedback:</p>
            <p className="text-yellow-700 text-sm mt-1">{sheet.return_comment}</p>
          </div>
        </div>
      )}

      {/* Goals Table */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle>Goals ({goals.length}/8)</CardTitle>
          {canEdit && (
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" disabled={goals.length >= 8}>
                  <Plus className="h-4 w-4 mr-1" /> Add Goal
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader><DialogTitle>Add New Goal</DialogTitle></DialogHeader>
                <GoalForm thrustAreas={thrustAreas} onSave={handleAdd} onClose={() => setAddOpen(false)} />
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {goals.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Target className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>No goals yet. Click 'Add Goal' to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Goal Title</TableHead>
                  <TableHead>Thrust Area</TableHead>
                  <TableHead>UoM Type</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead className="text-right">Weightage</TableHead>
                  {canEdit && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {goals.map(goal => {
                  const ta = thrustAreas.find(a => a.id === goal.thrust_area_id)
                  const isShared = !!goal.shared_goal_group_id
                  const uomLabel = UOM_OPTIONS.find(o => o.value === goal.uom_type)?.label || goal.uom_type

                  return (
                    <TableRow key={goal.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isShared && <Badge variant="info" className="text-xs"><Share2 className="h-3 w-3 mr-1" />Shared</Badge>}
                          <span className="font-medium">{goal.title}</span>
                        </div>
                        {goal.description && <p className="text-xs text-muted-foreground mt-0.5">{goal.description}</p>}
                      </TableCell>
                      <TableCell className="text-sm">{ta?.name || '—'}</TableCell>
                      <TableCell className="text-sm">{uomLabel}</TableCell>
                      <TableCell className="text-right text-sm">
                        {goal.uom_type === 'timeline' ? goal.target_date : goal.uom_type === 'zero' ? '0' : (goal.target_value ?? '—')}
                      </TableCell>
                      <TableCell className="text-right">
                        {managerEditMode && isManager ? (
                          <Input
                            type="number" min="10" max="100"
                            defaultValue={goal.weightage}
                            className="w-20 text-right ml-auto"
                            onChange={e => setManagerEdits(m => ({ ...m, [goal.id]: { ...m[goal.id], weightage: parseInt(e.target.value) } }))}
                          />
                        ) : (
                          <span className={isShared ? 'text-muted-foreground' : ''}>{goal.weightage}%</span>
                        )}
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            {!isShared && (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => setEditTarget(goal)}>
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(goal.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {isShared && <Lock className="h-4 w-4 text-muted-foreground opacity-50" />}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      {editTarget && (
        <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>Edit Goal</DialogTitle></DialogHeader>
            <GoalForm
              initial={{ ...editTarget, target_value: editTarget.target_value?.toString() || '', target_date: editTarget.target_date || '' }}
              thrustAreas={thrustAreas}
              onSave={handleEdit}
              onClose={() => setEditTarget(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Sticky bottom bar for employee */}
      {canEdit && (
        <div className="sticky bottom-0 bg-white border-t px-6 py-3 -mx-6 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-sm font-medium">Total Weightage: </span>
              <span className={`text-lg font-bold ${weightageOk ? 'text-green-600' : 'text-red-600'}`}>
                {totalWeightage}%
              </span>
              {!weightageOk && <span className="text-xs text-red-500 ml-2">(must equal 100%)</span>}
            </div>
            <span className="text-sm text-muted-foreground">{goals.length}/8 goals</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={refetch}>Save Draft</Button>
            <Button onClick={handleSubmit} disabled={submitting || !weightageOk || goals.length === 0}>
              {submitting ? 'Submitting…' : 'Submit for Approval'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
