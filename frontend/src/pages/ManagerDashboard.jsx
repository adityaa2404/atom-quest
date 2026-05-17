import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users, ArrowRight } from 'lucide-react'

const STATUS_CONFIG = {
  not_started: { label: 'Not Started', variant: 'outline' },
  draft: { label: 'Draft', variant: 'secondary' },
  submitted: { label: 'Submitted', variant: 'warning' },
  returned: { label: 'Returned', variant: 'destructive' },
  approved: { label: 'Approved', variant: 'success' },
  locked: { label: 'Approved', variant: 'success' },
}

export default function ManagerDashboard() {
  const navigate = useNavigate()
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/goals/team').then(({ data }) => {
      setTeam(data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const submitted = team.filter(e => e.sheet_status === 'submitted').length
  const approved = team.filter(e => ['approved', 'locked'].includes(e.sheet_status)).length

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Team Dashboard</h1>
        <p className="text-muted-foreground">Review and approve your team's goal sheets</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Team Members', value: team.length, icon: Users },
          { label: 'Awaiting Approval', value: submitted },
          { label: 'Approved', value: approved },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <p className="text-3xl font-bold">{value}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Team Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Goal Sheets</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : team.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>No team members found. Ensure employees have manager_id set to your profile.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Sheet Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.map(emp => {
                  const statusInfo = STATUS_CONFIG[emp.sheet_status] || STATUS_CONFIG.not_started
                  return (
                    <TableRow
                      key={emp.id}
                      className="cursor-pointer"
                      onClick={() => emp.sheet && navigate(`/manager/review/${emp.sheet.id}`)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{emp.full_name}</p>
                          <p className="text-xs text-muted-foreground">{emp.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{emp.department || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {emp.sheet?.submitted_at ? new Date(emp.sheet.submitted_at).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {emp.sheet ? (
                          <Button size="sm" variant={emp.sheet_status === 'submitted' ? 'default' : 'outline'}
                            onClick={e => { e.stopPropagation(); navigate(`/manager/review/${emp.sheet.id}`) }}>
                            {emp.sheet_status === 'submitted' ? 'Review' : 'View'}
                            <ArrowRight className="ml-1 h-3 w-3" />
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">No sheet yet</span>
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
    </div>
  )
}
