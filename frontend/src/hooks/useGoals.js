import { useState, useEffect, useCallback } from 'react'
import api from '@/lib/api'

export function useGoals(cycleId) {
  const [sheet, setSheet] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchSheet = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = cycleId ? `?cycle_id=${cycleId}` : ''
      const { data } = await api.get(`/api/goals/sheets/me${params}`)
      setSheet(data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
    } finally {
      setLoading(false)
    }
  }, [cycleId])

  useEffect(() => {
    fetchSheet()
  }, [fetchSheet])

  async function createSheet(cId) {
    const { data } = await api.post('/api/goals/sheets', { cycle_id: cId })
    setSheet(data)
    return data
  }

  async function addGoal(sheetId, goalData) {
    const { data } = await api.post(`/api/goals/sheets/${sheetId}/goals`, goalData)
    // Update goals list optimistically from response instead of full refetch
    setSheet(prev => prev ? { ...prev, goals: [...(prev.goals || []), data] } : prev)
    return data
  }

  async function editGoal(goalId, updates) {
    const { data } = await api.put(`/api/goals/${goalId}`, updates)
    setSheet(prev => prev ? {
      ...prev,
      goals: (prev.goals || []).map(g => g.id === goalId ? { ...g, ...data } : g)
    } : prev)
    return data
  }

  async function deleteGoal(goalId) {
    await api.delete(`/api/goals/${goalId}`)
    setSheet(prev => prev ? {
      ...prev,
      goals: (prev.goals || []).filter(g => g.id !== goalId)
    } : prev)
  }

  async function submitSheet(sheetId) {
    const { data } = await api.post(`/api/goals/sheets/${sheetId}/submit`)
    setSheet(data)
    return data
  }

  return {
    sheet,
    goals: sheet?.goals || [],
    loading,
    error,
    createSheet,
    addGoal,
    editGoal,
    deleteGoal,
    submitSheet,
    refetch: fetchSheet,
  }
}
