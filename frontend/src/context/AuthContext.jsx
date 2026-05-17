import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [effectiveRole, setEffectiveRole] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (data) {
      setProfile(data)
      setEffectiveRole(data.role)
    } else {
      setProfile(null)
      setEffectiveRole('pending')
    }
    setLoading(false)
  }

  useEffect(() => {
    // 1. Get existing session immediately (handles page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // 2. Listen for sign-in / sign-out events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        setSession(session)
        if (session?.user) fetchProfile(session.user.id)
      } else if (event === 'SIGNED_OUT') {
        setSession(null)
        setProfile(null)
        setEffectiveRole(null)
        setLoading(false)
      } else if (event === 'TOKEN_REFRESHED') {
        setSession(session)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function login(email, password) {
    return supabase.auth.signInWithPassword({ email, password })
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  function switchRole(role) {
    setEffectiveRole(role)
  }

  return (
    <AuthContext.Provider value={{ session, profile, effectiveRole, loading, login, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
