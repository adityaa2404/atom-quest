import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Target } from 'lucide-react'

export default function Login() {
  const { session, effectiveRole, loading } = useAuth()
  const navigate = useNavigate()

  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const [regForm, setRegForm] = useState({ email: '', password: '', confirmPassword: '', full_name: '' })
  const [regError, setRegError] = useState('')
  const [regSuccess, setRegSuccess] = useState('')
  const [regLoading, setRegLoading] = useState(false)

  // Already logged in — redirect immediately
  if (!loading && session && effectiveRole && effectiveRole !== 'pending') {
    if (effectiveRole === 'admin') return <Navigate to="/admin" replace />
    if (effectiveRole === 'manager') return <Navigate to="/manager" replace />
    return <Navigate to="/employee" replace />
  }

  async function handleLogin(e) {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password,
      })
      if (error) {
        setLoginError(error.message || 'Login failed')
        setLoginLoading(false)
        return
      }
      // Fetch profile directly and navigate — don't wait for onAuthStateChange
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle()
      const role = profile?.role
      if (role === 'admin') navigate('/admin', { replace: true })
      else if (role === 'manager') navigate('/manager', { replace: true })
      else navigate('/employee', { replace: true })
    } catch (e) {
      setLoginError('Unexpected error. Please try again.')
    }
    setLoginLoading(false)
  }

  async function handleRegister(e) {
    e.preventDefault()
    setRegError('')
    setRegSuccess('')
    if (regForm.password !== regForm.confirmPassword) { setRegError('Passwords do not match'); return }
    if (regForm.password.length < 6) { setRegError('Password must be at least 6 characters'); return }
    if (!regForm.full_name.trim()) { setRegError('Full name is required'); return }

    setRegLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: regForm.email,
      password: regForm.password,
      options: { data: { full_name: regForm.full_name } },
    })
    if (error) {
      setRegError(error.message || 'Registration failed')
    } else if (data.session) {
      setRegSuccess('Account created! An admin will assign your role.')
    } else {
      setRegSuccess('Account created! Check your email to confirm, then sign in.')
      setRegForm({ email: '', password: '', confirmPassword: '', full_name: '' })
    }
    setRegLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="bg-primary rounded-full p-3">
              <Target className="h-7 w-7 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">AtomQuest Goal Portal</CardTitle>
          <CardDescription>Manage your goals and track performance</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="login" className="flex-1">Sign In</TabsTrigger>
              <TabsTrigger value="register" className="flex-1">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" type="email" placeholder="you@atomquest.com"
                    value={loginForm.email} onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                    required autoFocus />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input id="login-password" type="password" placeholder="••••••••"
                    value={loginForm.password} onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                    required />
                </div>
                {loginError && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{loginError}</div>
                )}
                <Button type="submit" className="w-full" disabled={loginLoading}>
                  {loginLoading ? 'Signing in…' : 'Sign In'}
                </Button>
              </form>
              <div className="mt-6 text-xs text-muted-foreground text-center space-y-1">
                <p className="font-medium">Demo credentials:</p>
                <p>employee@atomquest.com — Aarya Agarwal</p>
                <p>manager@atomquest.com — Siddharth Wagh</p>
                <p>admin@atomquest.com — Vivek Patil</p>
                <p className="text-muted-foreground/60">Password: Password123!</p>
              </div>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-name">Full Name</Label>
                  <Input id="reg-name" type="text" placeholder="Aarya Agarwal"
                    value={regForm.full_name} onChange={e => setRegForm(f => ({ ...f, full_name: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input id="reg-email" type="email" placeholder="you@atomquest.com"
                    value={regForm.email} onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <Input id="reg-password" type="password" placeholder="Min. 6 characters"
                    value={regForm.password} onChange={e => setRegForm(f => ({ ...f, password: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-confirm">Confirm Password</Label>
                  <Input id="reg-confirm" type="password" placeholder="Repeat password"
                    value={regForm.confirmPassword} onChange={e => setRegForm(f => ({ ...f, confirmPassword: e.target.value }))} required />
                </div>
                {regError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{regError}</div>}
                {regSuccess && <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">{regSuccess}</div>}
                <Button type="submit" className="w-full" disabled={regLoading}>
                  {regLoading ? 'Creating account…' : 'Create Account'}
                </Button>
              </form>
              <p className="mt-4 text-xs text-muted-foreground text-center">
                After registering, an admin will assign your role and department.
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
