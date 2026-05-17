import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CheckCircle, Lock } from 'lucide-react'

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']

function ScoreBar({ score }) {
  if (score == null) return <span className="text-muted-foreground text-xs">—</span>
  const pct = Math.round(score)
  const color = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(pct,100)}%` }} />
      </div>
      <span className="text-xs font-mono">{pct}%</span>
    </div>
  )
}

export default function CheckIn() {
  const { effectiveRole } = useAuth()
  const { employeeId } = useParams()
  const [searchParams] = useSearchParams()
  const isManager = effectiveRole === 'manager' || effectiveRole === 'admin'

  const [data, setData] = useState(null)
  const [activeQuarter, setActiveQuarter] = useState(searchParams.get('quarter') || null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [inputs, setInputs] = useState({})
  const [checkinComment, setCheckinComment] = useState('')
  const [toast, setToast] = useState(null)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        if (isManager && employeeId) {
          const { data: d } = await api.get(`/api/checkins/team/${employeeId}${activeQuarter ? `?quarter=${activeQuarter}` : ''}`)
          setData(d)
          if (d.quarter && !activeQuarter) setActiveQuarter(d.quarter)
        } else {
          const { data: d } = await api.get(`/api/checkins/my-goals${activeQuarter ? `?quarter=${activeQuarter}` : ''}`)
          setData(d)
          if (d.quarter && !activeQuarter) setActiveQuarter(d.quarter)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [activeQuarter, employeeId, isManager])

  function handleInput(goalId, field, value) {
    setInputs(prev => ({ ...prev, [goalId]: { ...(prev[goalId] || {}), [field]: value } }))
  }

  async function handleSaveAchievement(goal) {
    const inp = inputs[goal.id] || {}
    const ach = goal.achievement || {}
    const payload = {
      goal_id: goal.id,
      quarter: activeQuarter,
      actual_value: inp.actual_value !== undefined ? parseFloat(inp.actual_value) : ach.actual_value,
      actual_date: inp.actual_date !== undefined ? inp.actual_date : ach.actual_date,
      status: inp.status || ach.status || 'not_started',
      comment: inp.comment !== undefined ? inp.comment : ach.employee_comment,
    }
    setSaving(true)
    try {
      const { data: res } = await api.post('/api/checkins/achievement', payload)
      showToast(`Saved. Score: ${res.computed_score?.toFixed(1)}%`)
      // Reload data
      const url = isManager && employeeId
        ? `/api/checkins/team/${employeeId}?quarter=${activeQuarter}`
        : `/api/checkins/my-goals?quarter=${activeQuarter}`
      const { data: d } = await api.get(url)
      setData(d)
    } catch (e) {
      showToast(e.response?.data?.detail || 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmitCheckin() {
    if (!checkinComment.trim()) {
      showToast('Check-in comment is required', 'error')
      return
    }
    try {
      await api.post('/api/checkins/submit', {
        goal_sheet_id: data.sheet?.id,
        quarter: activeQuarter,
        comment: checkinComment,
      })
      showToast('Check-in submitted!')
      const { data: d } = await api.get(`/api/checkins/team/${employeeId}?quarter=${activeQuarter}`)
      setData(d)
    } catch (e) {
      showToast(e.response?.data?.detail || 'Failed to submit check-in', 'error')
    }
  }

  const goals = data?.goals || []
  const isOpen = data?.is_quarter_open
  const checkin = data?.checkin
  const weightedScore = data?.weighted_score

  if (loading) return <div className="space-y-3">{[1,2,3].map(i=><Skeleton key={i} className="h-16 w-full"/>)}</div>

  return (
    <div className="space-y-6 max-w-5xl">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-md text-sm shadow-lg ${
          toast.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-green-100 text-green-800 border border-green-200'
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {isManager ? `Check-in: ${data?.employee?.full_name}` : 'My Achievements'}
          </h1>
          {weightedScore != null && (
            <p className="text-muted-foreground">Overall weighted score: <strong>{weightedScore.toFixed(1)}%</strong></p>
          )}
        </div>
        <div className="flex gap-2">
          {QUARTERS.map(q => (
            <Button key={q} variant={activeQuarter === q ? 'default' : 'outline'} size="sm"
              onClick={() => setActiveQuarter(q)}>{q}</Button>
          ))}
        </div>
      </div>

      {!isOpen && !isManager && (
        <div className="bg-muted rounded-md p-4 flex items-center gap-3 text-muted-foreground">
          <Lock className="h-5 w-5" />
          <p>{activeQuarter} check-in window is not currently open. You can view past entries but cannot edit.</p>
        </div>
      )}

      {checkin && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-800">Check-in completed</span>
            </div>
            <p className="text-sm text-green-700 mt-1">{checkin.comment}</p>
          </CardContent>
        </Card>
      )}

      {goals.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No approved goals found. Goals must be locked before logging achievements.
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Goal</TableHead>
                  <TableHead className="text-right">Target</TableHead>
                  <TableHead>Actual</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  {(!isManager || !employeeId) && isOpen && <TableHead className="text-right">Save</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {goals.map(goal => {
                  const ach = goal.achievement || {}
                  const inp = inputs[goal.id] || {}
                  const needsDate = goal.uom_type === 'timeline'
                  const isZero = goal.uom_type === 'zero'

                  return (
                    <TableRow key={goal.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{goal.title}</p>
                        <p className="text-xs text-muted-foreground">{goal.weightage}% weightage</p>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {needsDate ? goal.target_date : isZero ? '0' : (goal.target_value ?? '—')}
                      </TableCell>
                      <TableCell>
                        {!isManager && isOpen ? (
                          needsDate ? (
                            <Input type="date" className="w-36"
                              defaultValue={ach.actual_date || ''}
                              onChange={e => handleInput(goal.id, 'actual_date', e.target.value)} />
                          ) : isZero ? (
                            <Select defaultValue={String(ach.actual_value ?? '')}
                              onValueChange={v => handleInput(goal.id, 'actual_value', v)}>
                              <SelectTrigger className="w-28"><SelectValue placeholder="Value" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0">0 (Success)</SelectItem>
                                <SelectItem value="1">1+</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input type="number" className="w-28"
                              defaultValue={ach.actual_value ?? ''}
                              onChange={e => handleInput(goal.id, 'actual_value', e.target.value)} />
                          )
                        ) : (
                          <span className="text-sm">{ach.actual_value ?? ach.actual_date ?? '—'}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {!isManager && isOpen ? (
                          <Select defaultValue={ach.status || 'not_started'}
                            onValueChange={v => handleInput(goal.id, 'status', v)}>
                            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="not_started">Not Started</SelectItem>
                              <SelectItem value="on_track">On Track</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={ach.status === 'completed' ? 'success' : ach.status === 'on_track' ? 'warning' : 'secondary'}>
                            {ach.status || 'not_started'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <ScoreBar score={ach.computed_score} />
                      </TableCell>
                      {!isManager && isOpen && (
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" disabled={saving}
                            onClick={() => handleSaveAchievement(goal)}>
                            Save
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Manager check-in submission */}
      {isManager && employeeId && !checkin && goals.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Submit Check-in</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Label>Check-in Comment (required)</Label>
            <Textarea
              placeholder="Discuss progress, recognition, or areas for improvement…"
              value={checkinComment}
              onChange={e => setCheckinComment(e.target.value)}
              rows={4}
            />
            <Button onClick={handleSubmitCheckin}>Submit Check-in</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
