import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
function AtomLogo({ size = 44 }) {
  return (
    <svg viewBox="0 0 1024 1024" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
      <path d="M694.3 430.2c0-65.6-22.3-126.1-59.7-174.3 29.5 83.1-28.6 245-95.7 308.9-74.6 71.1-223.2 120.8-303 91.7 48.1 36.9 108.1 58.9 173.2 58.9 157.3-0.1 285.2-128 285.2-285.2z" fill="#FFD524" />
      <path d="M951.6 893L740.4 681.8c-11.7-11.7-30.6-11.7-42.3 0-11.7 11.7-11.7 30.6 0 42.3l211.2 211.2c5.8 5.8 13.5 8.8 21.1 8.8 7.7 0 15.3-2.9 21.1-8.8 11.8-11.7 11.8-30.6 0.1-42.3zM409.1 85.2c-38.5 0-76.3 6.3-112.3 18.7-15.6 5.4-23.9 22.4-18.5 38s22.4 23.9 38 18.5c29.8-10.3 61-15.5 92.9-15.5 91.6 0 173.2 43.5 225.4 110.9 37.4 48.2 59.7 108.7 59.7 174.3 0 157.2-127.9 285.2-285.2 285.2-65.1 0-125.2-22-173.2-58.9-68-52.1-111.9-134.1-111.9-226.2 0-55.1 15.7-108.5 45.4-154.5 9-13.9 5-32.4-8.9-41.3-13.9-9-32.4-5-41.3 8.9-36 55.7-55 120.3-55 186.9 0 190.2 154.7 344.9 344.9 344.9S754 620.4 754 430.2s-154.7-345-344.9-345z" fill="#333333" />
      <path d="M204.2 220.8c6.9 0 13.8-2.4 19.4-7.2 5-4.2 10.1-8.4 15.4-12.3 13.2-9.9 16-28.6 6.1-41.8-9.9-13.3-28.6-16-41.8-6.1-6.4 4.8-12.6 9.8-18.6 14.9-12.5 10.7-14 29.6-3.2 42.1 5.9 6.8 14.3 10.4 22.7 10.4z" fill="#333333" />
    </svg>
  )
}

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
            <AtomLogo size={52} />
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
                <p>employee@atomquest.com</p>
                <p>manager@atomquest.com</p>
                <p>admin@atomquest.com</p>
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
