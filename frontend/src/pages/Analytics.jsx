import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell,
} from 'recharts'

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899']

function EmptyState() {
  return <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No data available for this period.</div>
}

function SortableTable({ data, columns }) {
  const [sortKey, setSortKey] = useState(null)
  const [asc, setAsc] = useState(true)

  function handleSort(key) {
    if (sortKey === key) setAsc(a => !a)
    else { setSortKey(key); setAsc(true) }
  }

  const sorted = sortKey
    ? [...data].sort((a, b) => {
        const va = a[sortKey], vb = b[sortKey]
        if (va == null) return 1
        if (vb == null) return -1
        return asc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
      })
    : data

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            {columns.map(col => (
              <th key={col.key} className={`py-3 px-4 text-left font-medium text-muted-foreground cursor-pointer hover:text-foreground ${col.right ? 'text-right' : ''}`}
                onClick={() => handleSort(col.key)}>
                {col.label} {sortKey === col.key ? (asc ? '↑' : '↓') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i} className={`border-b last:border-0 ${row._highlight ? 'bg-red-50' : i % 2 === 0 ? '' : 'bg-muted/30'}`}>
              {columns.map(col => (
                <td key={col.key} className={`py-3 px-4 ${col.right ? 'text-right' : ''}`}>
                  {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function getHeatColor(rate, isOpen) {
  if (isOpen) return 'bg-blue-100 text-blue-700'
  if (rate == null) return 'bg-muted text-muted-foreground'
  if (rate >= 80) return 'bg-green-100 text-green-800'
  if (rate >= 50) return 'bg-yellow-100 text-yellow-800'
  return 'bg-red-100 text-red-800'
}

export default function Analytics() {
  const [qoq, setQoq] = useState(null)
  const [dist, setDist] = useState(null)
  const [heatmap, setHeatmap] = useState(null)
  const [mgr, setMgr] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [qoqR, distR, hmR, mgrR] = await Promise.allSettled([
        api.get('/api/analytics/qoq-trends'),
        api.get('/api/analytics/goal-distribution'),
        api.get('/api/analytics/completion-heatmap'),
        api.get('/api/analytics/manager-effectiveness'),
      ])
      if (qoqR.status === 'fulfilled') setQoq(qoqR.value.data)
      if (distR.status === 'fulfilled') setDist(distR.value.data)
      if (hmR.status === 'fulfilled') setHeatmap(hmR.value.data)
      if (mgrR.status === 'fulfilled') setMgr(mgrR.value.data)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4 max-w-6xl">
        <h1 className="text-2xl font-bold">Analytics</h1>
        {[1,2,3].map(i => <Skeleton key={i} className="h-64 w-full" />)}
      </div>
    )
  }

  // QoQ trend data
  const qoqChartData = qoq?.quarters?.map(q => {
    const entry = { quarter: q }
    qoq.series?.forEach(s => { entry[s.label] = s.data[q] })
    return entry
  }) || []

  // Goal distribution
  const thrustData = dist?.by_thrust_area || []
  const uomData = dist?.by_uom_type || []

  // Status bar data
  const statusData = ['Q1','Q2','Q3','Q4'].map(q => ({
    quarter: q,
    not_started: dist?.status_per_quarter?.[q]?.not_started || 0,
    on_track: dist?.status_per_quarter?.[q]?.on_track || 0,
    completed: dist?.status_per_quarter?.[q]?.completed || 0,
  }))

  // Heatmap
  const departments = heatmap?.departments || []
  const quarters = ['Q1','Q2','Q3','Q4']

  // Manager effectiveness
  const mgrData = (mgr?.managers || []).map(m => ({
    ...m,
    _highlight: (m.q1_checkin_pct || 0) < 50 || (m.q2_checkin_pct || 0) < 50 ||
                (m.q3_checkin_pct || 0) < 50 || (m.q4_checkin_pct || 0) < 50,
  }))

  const mgrColumns = [
    { key: 'name', label: 'Manager' },
    { key: 'team_size', label: 'Team Size', right: true },
    { key: 'approved_pct', label: 'Goals Approved %', right: true,
      render: v => v != null ? `${v.toFixed(1)}%` : '—' },
    { key: 'q1_checkin_pct', label: 'Q1 Check-in %', right: true,
      render: v => v != null ? `${v.toFixed(1)}%` : '—' },
    { key: 'q2_checkin_pct', label: 'Q2 Check-in %', right: true,
      render: v => v != null ? `${v.toFixed(1)}%` : '—' },
    { key: 'q3_checkin_pct', label: 'Q3 Check-in %', right: true,
      render: v => v != null ? `${v.toFixed(1)}%` : '—' },
    { key: 'q4_checkin_pct', label: 'Q4 Check-in %', right: true,
      render: v => v != null ? `${v.toFixed(1)}%` : '—' },
    { key: 'avg_score', label: 'Avg Score', right: true,
      render: v => v != null ? `${v.toFixed(1)}%` : '—' },
  ]

  return (
    <div className="space-y-6 max-w-6xl">
      <h1 className="text-2xl font-bold">Analytics</h1>

      <Tabs defaultValue="trends">
        <TabsList className="mb-4">
          <TabsTrigger value="trends">QoQ Trends</TabsTrigger>
          <TabsTrigger value="heatmap">Completion Heatmap</TabsTrigger>
          <TabsTrigger value="distribution">Goal Distribution</TabsTrigger>
          <TabsTrigger value="managers">Manager Effectiveness</TabsTrigger>
        </TabsList>

        {/* QoQ Trends */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Quarter-over-Quarter Weighted Score Trends</CardTitle></CardHeader>
            <CardContent>
              {qoqChartData.length === 0 ? <EmptyState /> : (
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={qoqChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="quarter" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                      <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
                      <Legend />
                      {qoq?.series?.map((s, i) => (
                        <Line key={s.label} type="monotone" dataKey={s.label}
                          stroke={COLORS[i % COLORS.length]} strokeWidth={2}
                          dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Completion Heatmap */}
        <TabsContent value="heatmap">
          <Card>
            <CardHeader>
              <CardTitle>Check-in Completion by Department</CardTitle>
            </CardHeader>
            <CardContent>
              {departments.length === 0 ? <EmptyState /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr>
                        <th className="text-left py-2 px-4 font-medium text-muted-foreground border-b">Department</th>
                        {quarters.map(q => (
                          <th key={q} className="text-center py-2 px-4 font-medium text-muted-foreground border-b w-28">{q}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {departments.map(dept => (
                        <tr key={dept.name} className="border-b last:border-0">
                          <td className="py-3 px-4 font-medium">{dept.name}</td>
                          {quarters.map(q => {
                            const cell = dept[q]
                            const rate = cell?.rate
                            const isOpen = cell?.is_open
                            return (
                              <td key={q} className="py-3 px-4 text-center">
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getHeatColor(rate, isOpen)}`}>
                                  {isOpen ? 'Open' : rate != null ? `${rate}%` : 'N/A'}
                                </span>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex gap-4 mt-4 pt-3 border-t text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-green-200"></span> ≥80%</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-yellow-200"></span> 50–79%</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-red-200"></span> &lt;50%</span>
                    <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full bg-blue-200"></span> Open</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Goal Distribution */}
        <TabsContent value="distribution" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Goals by Thrust Area</CardTitle></CardHeader>
              <CardContent>
                {thrustData.length === 0 ? <EmptyState /> : (
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={thrustData} dataKey="count" nameKey="name"
                          cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                          {thrustData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Goals by UoM Type</CardTitle></CardHeader>
              <CardContent>
                {uomData.length === 0 ? <EmptyState /> : (
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={uomData} dataKey="count" nameKey="name"
                          cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                          {uomData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Achievement Status by Quarter</CardTitle></CardHeader>
            <CardContent>
              {statusData.every(d => d.not_started + d.on_track + d.completed === 0) ? <EmptyState /> : (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="quarter" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="not_started" name="Not Started" stackId="a" fill="#d1d5db" />
                      <Bar dataKey="on_track" name="On Track" stackId="a" fill="#f59e0b" />
                      <Bar dataKey="completed" name="Completed" stackId="a" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manager Effectiveness */}
        <TabsContent value="managers">
          <Card>
            <CardHeader>
              <CardTitle>Manager Effectiveness</CardTitle>
              <p className="text-sm text-muted-foreground">Rows highlighted in red have at least one quarter with check-in rate below 50%.</p>
            </CardHeader>
            <CardContent className="p-0">
              {mgrData.length === 0 ? (
                <div className="p-12"><EmptyState /></div>
              ) : (
                <SortableTable data={mgrData} columns={mgrColumns} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
