import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

function AtomLogo({ size = 28 }) {
  return (
    <svg viewBox="0 0 1024 1024" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
      <path d="M694.3 430.2c0-65.6-22.3-126.1-59.7-174.3 29.5 83.1-28.6 245-95.7 308.9-74.6 71.1-223.2 120.8-303 91.7 48.1 36.9 108.1 58.9 173.2 58.9 157.3-0.1 285.2-128 285.2-285.2z" fill="#FFD524" />
      <path d="M951.6 893L740.4 681.8c-11.7-11.7-30.6-11.7-42.3 0-11.7 11.7-11.7 30.6 0 42.3l211.2 211.2c5.8 5.8 13.5 8.8 21.1 8.8 7.7 0 15.3-2.9 21.1-8.8 11.8-11.7 11.8-30.6 0.1-42.3zM409.1 85.2c-38.5 0-76.3 6.3-112.3 18.7-15.6 5.4-23.9 22.4-18.5 38s22.4 23.9 38 18.5c29.8-10.3 61-15.5 92.9-15.5 91.6 0 173.2 43.5 225.4 110.9 37.4 48.2 59.7 108.7 59.7 174.3 0 157.2-127.9 285.2-285.2 285.2-65.1 0-125.2-22-173.2-58.9-68-52.1-111.9-134.1-111.9-226.2 0-55.1 15.7-108.5 45.4-154.5 9-13.9 5-32.4-8.9-41.3-13.9-9-32.4-5-41.3 8.9-36 55.7-55 120.3-55 186.9 0 190.2 154.7 344.9 344.9 344.9S754 620.4 754 430.2s-154.7-345-344.9-345z" fill="#333333" />
      <path d="M204.2 220.8c6.9 0 13.8-2.4 19.4-7.2 5-4.2 10.1-8.4 15.4-12.3 13.2-9.9 16-28.6 6.1-41.8-9.9-13.3-28.6-16-41.8-6.1-6.4 4.8-12.6 9.8-18.6 14.9-12.5 10.7-14 29.6-3.2 42.1 5.9 6.8 14.3 10.4 22.7 10.4z" fill="#333333" />
    </svg>
  )
}

const API_URL = import.meta.env.VITE_API_BASE_URL || 'https://atom-quest.onrender.com'

function BackendStatus() {
  const [status, setStatus] = useState('waking') // 'waking' | 'ready' | 'error'

  useEffect(() => {
    let cancelled = false
    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(10000) })
        if (!cancelled && res.ok) { setStatus('ready'); return }
      } catch {}
      if (!cancelled) setTimeout(poll, 4000)
    }
    poll()
    return () => { cancelled = true }
  }, [])

  if (status === 'ready') {
    return (
      <div className="w-full bg-green-600 text-white text-center text-sm py-2 font-medium">
        Backend is ready to use
      </div>
    )
  }

  return (
    <div className="w-full bg-amber-500 text-white text-center text-sm py-2 font-medium flex items-center justify-center gap-2">
      <span className="inline-block h-3 w-3 rounded-full bg-white animate-pulse" />
      Backend waking up on Render — this may take up to 60 seconds on first load
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <BackendStatus />

      {/* Nav */}
      <nav className="border-b px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AtomLogo size={32} />
          <span className="font-bold text-lg">AtomQuest</span>
        </div>
        <Button onClick={() => navigate('/login')}>
          Sign In <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </nav>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 text-center max-w-2xl mx-auto w-full py-16">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-4">
          AtomQuest Hackathon
        </p>
        <h1 className="text-4xl font-bold tracking-tight mb-3">
          In-House Goal Setting &amp; Tracking Portal
        </h1>
        <p className="text-muted-foreground mb-10 text-base">
          A performance management system for employees, managers, and HR.
        </p>

        {/* Problem statement */}
        <div className="text-left w-full bg-slate-50 rounded-xl border p-6 mb-10 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Problem Statement</p>
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex gap-2"><span className="text-primary mt-0.5">→</span> Employees set up to 8 goals per cycle with targets, thrust areas, and weightages</li>
            <li className="flex gap-2"><span className="text-primary mt-0.5">→</span> Managers review, approve, or return goal sheets; conduct quarterly check-ins</li>
            <li className="flex gap-2"><span className="text-primary mt-0.5">→</span> Scores are computed automatically across 6 measurement types (numeric, %, timeline, zero-based)</li>
            <li className="flex gap-2"><span className="text-primary mt-0.5">→</span> Admins manage cycles, push shared goals, run escalations, and export reports</li>
            <li className="flex gap-2"><span className="text-primary mt-0.5">→</span> Analytics: QoQ trends, completion heatmaps, goal distribution, manager effectiveness</li>
          </ul>
        </div>

        <Button size="lg" onClick={() => navigate('/login')}>
          Sign In to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <p className="text-xs text-muted-foreground mt-4">
          Demo — employee@atomquest.com · manager@atomquest.com · admin@atomquest.com · Password123!
        </p>
      </main>

      <footer className="border-t px-8 py-4 text-center text-xs text-muted-foreground">
        AtomQuest Goal Portal · Built for the AtomQuest Hackathon 2026
      </footer>
    </div>
  )
}
