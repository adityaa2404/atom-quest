import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Users, Target, CheckSquare, Calendar, Download } from 'lucide-react'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [cycles, setCycles] = useState([])
  const [thrustAreas, setThrustAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [cycleForm, setCycleForm] = useState({ name: '', goal_setting_start: '', goal_setting_end: '', q1_start: '', q1_end: '', q2_start: '', q2_end: '', q3_start: '', q3_end: '', q4_start: '', q4_end: '' })
  const [taForm, setTaForm] = useState({ name: '', description: '' })
  const [toast, setToast] = useState(null)
  const [exporting, setExporting] = useState(false)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function loadAll() {
    const [statsR, cyclesR, taR] = await Promise.allSettled([
      api.get('/api/admin/completion-dashboard'),
      api.get('/api/admin/cycles'),
      api.get('/api/admin/thrust-areas'),
    ])
    if (statsR.status === 'fulfilled') setStats(statsR.value.data)
    if (cyclesR.status === 'fulfilled') setCycles(cyclesR.value.data)
    if (taR.status === 'fulfilled') setThrustAreas(taR.value.data)
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  async function handleCreateCycle(e) {
    e.preventDefault()
    try {
      await api.post('/api/admin/cycles', cycleForm)
      showToast('Cycle created')
      loadAll()
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed', 'error')
    }
  }

  async function handleActivateCycle(id) {
    try {
      await api.post(`/api/admin/cycles/${id}/activate`)
      showToast('Cycle activated')
      loadAll()
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed', 'error')
    }
  }

  async function handleCreateTA(e) {
    e.preventDefault()
    try {
      await api.post('/api/admin/thrust-areas', taForm)
      showToast('Thrust area created')
      loadAll()
    } catch (err) {
      showToast(err.response?.data?.detail || 'Failed', 'error')
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const resp = await api.get('/api/reports/achievement-export', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([resp.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'achievement_report.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      showToast('Report downloaded')
    } catch (err) {
      showToast('Export failed', 'error')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-md text-sm shadow-lg ${
          toast.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-green-100 text-green-800 border border-green-200'
        }`}>{toast.msg}</div>
      )}

      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i=><Skeleton key={i} className="h-24"/>)}</div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Employees', value: stats?.total_employees || 0, icon: Users },
            { label: 'Goals Submitted', value: `${stats?.submitted_pct || 0}%`, sub: `${stats?.submitted_count || 0} employees` },
            { label: 'Goals Approved', value: `${stats?.approved_pct || 0}%`, sub: `${stats?.approved_count || 0} employees` },
            { label: `${stats?.current_quarter || 'Q?'} Check-ins`, value: `${stats?.current_quarter_checkin_pct || 0}%` },
          ].map(({ label, value, sub, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="pt-6">
                <p className="text-3xl font-bold">{value}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
                {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="cycles">
        <TabsList className="mb-4">
          <TabsTrigger value="cycles">Cycles</TabsTrigger>
          <TabsTrigger value="thrust-areas">Thrust Areas</TabsTrigger>
          <TabsTrigger value="export">Reports</TabsTrigger>
        </TabsList>

        {/* Cycles Tab */}
        <TabsContent value="cycles" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>All Cycles</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Goal Setting Window</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cycles.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-sm">{c.goal_setting_start} → {c.goal_setting_end}</TableCell>
                      <TableCell>
                        {c.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        {!c.is_active && (
                          <Button size="sm" variant="outline" onClick={() => handleActivateCycle(c.id)}>
                            Set Active
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Create New Cycle</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleCreateCycle} className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1">
                  <Label>Cycle Name</Label>
                  <Input placeholder="e.g. FY 2026-27" value={cycleForm.name}
                    onChange={e => setCycleForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                {[
                  ['goal_setting_start', 'Goal Setting Start'], ['goal_setting_end', 'Goal Setting End'],
                  ['q1_start', 'Q1 Start'], ['q1_end', 'Q1 End'],
                  ['q2_start', 'Q2 Start'], ['q2_end', 'Q2 End'],
                  ['q3_start', 'Q3 Start'], ['q3_end', 'Q3 End'],
                  ['q4_start', 'Q4 Start'], ['q4_end', 'Q4 End'],
                ].map(([field, label]) => (
                  <div key={field} className="space-y-1">
                    <Label>{label}</Label>
                    <Input type="date" value={cycleForm[field]}
                      onChange={e => setCycleForm(f => ({ ...f, [field]: e.target.value }))}
                      required={['goal_setting_start','goal_setting_end'].includes(field)} />
                  </div>
                ))}
                <div className="col-span-2">
                  <Button type="submit">Create Cycle</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Thrust Areas Tab */}
        <TabsContent value="thrust-areas" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Thrust Areas</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {thrustAreas.map(ta => (
                    <TableRow key={ta.id}>
                      <TableCell className="font-medium">{ta.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{ta.description || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={ta.is_active ? 'success' : 'secondary'}>{ta.is_active ? 'Active' : 'Inactive'}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Add Thrust Area</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleCreateTA} className="space-y-4">
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input placeholder="e.g. Digital Transformation" value={taForm.name}
                    onChange={e => setTaForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="space-y-1">
                  <Label>Description</Label>
                  <Input placeholder="Optional description" value={taForm.description}
                    onChange={e => setTaForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <Button type="submit">Add Thrust Area</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle>Achievement Report Export</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Download a formatted Excel report with all employees, their goals, quarterly actuals, and computed scores.
              </p>
              <Button onClick={handleExport} disabled={exporting} className="gap-2">
                <Download className="h-4 w-4" />
                {exporting ? 'Generating…' : 'Download Excel Report (.xlsx)'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
