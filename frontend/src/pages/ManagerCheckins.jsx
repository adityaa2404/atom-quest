import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react'

export default function ManagerCheckins() {
  const navigate = useNavigate()
  const [team, setTeam] = useState([])
  const [quarter, setQuarter] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/checkins/active-quarter').then(({ data }) => {
      setQuarter(data.quarter)
      return api.get(`/api/checkins/team?quarter=${data.quarter || 'Q1'}`)
    }).then(({ data }) => {
      setTeam(data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const done = team.filter(e => e.checkin_done).length

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team Check-ins</h1>
          <p className="text-muted-foreground">Quarter: <strong>{quarter || 'No active quarter'}</strong></p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{done}/{team.length}</p>
          <p className="text-sm text-muted-foreground">Check-ins completed</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{[1,2,3].map(i=><Skeleton key={i} className="h-12 w-full"/>)}</div>
          ) : team.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No team members with approved goal sheets.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Achievements Logged</TableHead>
                  <TableHead>Check-in Done</TableHead>
                  <TableHead className="text-right">Weighted Score</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {team.map(emp => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <p className="font-medium">{emp.full_name}</p>
                      <p className="text-xs text-muted-foreground">{emp.department || emp.email}</p>
                    </TableCell>
                    <TableCell>
                      {emp.has_achievements
                        ? <span className="flex items-center gap-1 text-green-700"><CheckCircle className="h-4 w-4"/>Yes</span>
                        : <span className="flex items-center gap-1 text-muted-foreground"><XCircle className="h-4 w-4"/>Not yet</span>}
                    </TableCell>
                    <TableCell>
                      {emp.checkin_done
                        ? <Badge variant="success">Done</Badge>
                        : <Badge variant="secondary">Pending</Badge>}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {emp.weighted_score != null ? `${emp.weighted_score.toFixed(1)}%` : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {emp.sheet_id && (
                        <Button size="sm" variant="outline"
                          onClick={() => navigate(`/manager/checkin/${emp.id}?quarter=${quarter}`)}>
                          {emp.checkin_done ? 'View' : 'Check In'}
                          <ArrowRight className="ml-1 h-3 w-3"/>
                        </Button>
                      )}
                    </TableCell>
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
