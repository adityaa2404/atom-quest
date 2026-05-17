import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useGoals } from '@/hooks/useGoals'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Target, Calendar, CheckCircle, Clock, ArrowRight, AlertCircle } from 'lucide-react'

const STATUS_CONFIG = {
  draft: { label: 'Draft', variant: 'secondary' },
  submitted: { label: 'Submitted', variant: 'warning' },
  returned: { label: 'Returned for Rework', variant: 'destructive' },
  approved: { label: 'Approved', variant: 'success' },
  locked: { label: 'Approved & Locked', variant: 'success' },
}

export default function EmployeeDashboard() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [cycle, setCycle] = useState(null)
  const [activeQuarter, setActiveQuarter] = useState(null)
  const { sheet, loading, createSheet } = useGoals()

  useEffect(() => {
    api.get('/api/checkins/active-quarter').then(({ data }) => {
      setCycle(data.cycle)
      setActiveQuarter(data.quarter)
    }).catch(() => {})
  }, [])

  async function handleStartSheet() {
    if (!cycle) return
    try {
      await createSheet(cycle.id)
      navigate('/goals')
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create goal sheet')
    }
  }

  const statusInfo = sheet ? STATUS_CONFIG[sheet.status] : null

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {profile?.full_name?.split(' ')[0]}</h1>
        <p className="text-muted-foreground">Here's your goal tracking overview</p>
      </div>

      {/* Active Cycle Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Active Cycle</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {!cycle ? (
            <Skeleton className="h-12 w-full" />
          ) : (
            <div className="space-y-2">
              <p className="text-xl font-semibold">{cycle.name}</p>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>Goal Setting: {cycle.goal_setting_start} → {cycle.goal_setting_end}</span>
                {activeQuarter && (
                  <Badge variant="info">{activeQuarter} Open</Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Goal Sheet Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">My Goal Sheet</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-60" />
            </div>
          ) : !sheet ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="h-5 w-5" />
                <p>You haven't started your goal sheet for this cycle yet.</p>
              </div>
              {cycle && (
                <Button onClick={handleStartSheet}>
                  Start Goal Sheet for {cycle.name}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {sheet.status === 'returned' && sheet.return_comment && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm">
                  <p className="font-medium text-yellow-800">Manager feedback:</p>
                  <p className="text-yellow-700 mt-1">{sheet.return_comment}</p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Status:</span>
                    <Badge variant={statusInfo?.variant}>{statusInfo?.label}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {sheet.goals?.length || 0} goal{sheet.goals?.length !== 1 ? 's' : ''} •{' '}
                    Total weightage: {(sheet.goals || []).reduce((s, g) => s + g.weightage, 0)}%
                  </p>
                  {sheet.submitted_at && (
                    <p className="text-xs text-muted-foreground">
                      Submitted: {new Date(sheet.submitted_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Button
                  onClick={() => navigate('/goals')}
                  variant={sheet.status === 'draft' || sheet.status === 'returned' ? 'default' : 'outline'}
                >
                  {sheet.status === 'draft' || sheet.status === 'returned' ? 'Edit Goal Sheet' : 'View Goal Sheet'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Achievements Quick Card */}
      {sheet && sheet.status === 'locked' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Quarterly Achievements</CardTitle>
            </div>
            <CardDescription>Log your progress for {activeQuarter || 'the current quarter'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/checkin')}>
              Go to Achievements
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
