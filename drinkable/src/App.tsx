import type { ChangeEvent, FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

type BacSummary = {
  bac: number
  hydration_score: number
  hydration_modifier: number
  snack_modifier: number
  baseline_rest_minutes: number
  rest_minutes: number
  hours_since_start: number
}

type AiDrinkPrediction = {
  ai_drink_type: string
  ai_volume_ml: number
  ai_abv_percent: number
  ai_confidence: number
}

type ActivityEntry = {
  id: string
  type: 'session' | 'drink' | 'water' | 'snack' | 'ai'
  detail: string
  timestamp: string
}

type BacHistoryPoint = {
  bac: number
  timestamp: number
}

const rawBackend = (import.meta.env.VITE_BACKEND_URL as string | undefined) ?? 'http://localhost:8000'
const API_BASE = rawBackend.endsWith('/api') ? rawBackend : `${rawBackend}/api`

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const computePaceScore = (timestamps: number[]) => {
  if (timestamps.length < 2) return 3
  const recent = timestamps.slice(-3)
  const intervals: number[] = []
  for (let i = 1; i < recent.length; i += 1) {
    intervals.push((recent[i] - recent[i - 1]) / 60000)
  }
  const avgMinutes = intervals.reduce((sum, dur) => sum + dur, 0) / intervals.length
  const score = 10 - avgMinutes * 1.5
  return clamp(Number(score.toFixed(1)), 0, 10)
}

const paceFromScore = (score: number) => {
  if (score <= 3) return 'slow'
  if (score <= 6) return 'normal'
  return 'fast'
}

const mockHistory = (bac: number): BacHistoryPoint[] => {
  const points = 8
  const now = Date.now()
  return Array.from({ length: points }, (_, index) => {
    const minutesAgo = (points - index - 1) * 15
    const decayed = clamp(bac - minutesAgo * 0.002, 0, 0.25)
    return { bac: Number(decayed.toFixed(3)), timestamp: now - minutesAgo * 60_000 }
  })
}

const TrendChart = ({ history }: { history: BacHistoryPoint[] }) => {
  if (!history.length) {
    return <div className="chart-placeholder">Log a drink to unlock the trend.</div>
  }

  const width = 420
  const height = 160
  const maxBac = 0.25
  const points = history
    .map((point, index) => {
      const x = (index / Math.max(history.length - 1, 1)) * width
      const y = height - (clamp(point.bac, 0, maxBac) / maxBac) * height
      return `${x},${clamp(y, 0, height)}`
    })
    .join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="trend-chart" role="presentation">
      <defs>
        <linearGradient id="bacGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1F4EF5" />
          <stop offset="100%" stopColor="#8BA8F9" />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke="url(#bacGradient)" strokeWidth={5} strokeLinecap="round" points={points} />
    </svg>
  )
}

const jsonRequest = async <T,>(path: string, payload: unknown) => {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const message = await res.text()
    throw new Error(message || res.statusText)
  }

  return (await res.json()) as T
}

const getStoredUserId = () => {
  const key = 'drinkable-user-id'
  const existing = localStorage.getItem(key)
  if (existing) return existing
  const fresh = crypto.randomUUID()
  localStorage.setItem(key, fresh)
  return fresh
}

function App() {
  const userId = useMemo(getStoredUserId, [])

  const [sessionId, setSessionId] = useState('')
  const [summary, setSummary] = useState<BacSummary | null>(null)
  const [status, setStatus] = useState('Initialising session…')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const [drinkVolume, setDrinkVolume] = useState(350)
  const [drinkAbv, setDrinkAbv] = useState(12)
  const [hydrationVolume, setHydrationVolume] = useState(200)
  const [snackType, setSnackType] = useState('Light snack')
  const [snackModifier, setSnackModifier] = useState(0.95)
  const [pendingAiDrink, setPendingAiDrink] = useState<AiDrinkPrediction | null>(null)
  const [activity, setActivity] = useState<ActivityEntry[]>([])
  const [bacHistory, setBacHistory] = useState<BacHistoryPoint[]>([])
  const [drinkMoments, setDrinkMoments] = useState<number[]>([])

  const pushActivity = (entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => {
    const now = new Date()
    setActivity((prev) => [
      {
        id: crypto.randomUUID(),
        timestamp: now.toISOString(),
        ...entry,
      },
      ...prev,
    ].slice(0, 8))

    if (entry.type === 'drink') {
      setDrinkMoments((prev) => [...prev.slice(-5), now.getTime()])
    }
  }

  const startSession = useCallback(
    async (opts?: { reset?: boolean }) => {
      if (opts?.reset) {
        setSessionId('')
        setSummary(null)
        setStatus('Starting fresh session…')
      }
      setLoading(true)
      setError('')
      try {
        const data = await jsonRequest<{ session_id: string }>(
          '/session/start',
          { user_id: userId }
        )
        setSessionId(data.session_id)
        setStatus('Session active')
        pushActivity({ type: 'session', detail: 'Started new session' })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start session')
      } finally {
        setLoading(false)
      }
    },
    [userId]
  )

  useEffect(() => {
    startSession()
  }, [startSession])

  useEffect(() => {
    if (!summary) return
    setBacHistory((prev) => {
      const next = [...prev, { bac: summary.bac, timestamp: Date.now() }]
      return next.slice(-10)
    })
  }, [summary])

  const refreshSummary = (data: BacSummary) => {
    setSummary(data)
    setStatus('BAC updated')
  }

  const guardedAction = async (fn: () => Promise<void>) => {
    if (!sessionId) {
      setError('Session not ready yet.')
      return
    }
    setError('')
    try {
      await fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error')
    }
  }

  const handleAddDrink = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    guardedAction(async () => {
      const data = await jsonRequest<BacSummary>('/drinks/add', {
        session_id: sessionId,
        volume_ml: Number(drinkVolume),
        abv_percent: Number(drinkAbv),
      })
      refreshSummary(data)
      pushActivity({ type: 'drink', detail: `${drinkVolume} ml @ ${drinkAbv}%` })
    })
  }

  const handleAddHydration = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    guardedAction(async () => {
      const data = await jsonRequest<BacSummary>('/hydration/add', {
        session_id: sessionId,
        volume_ml: Number(hydrationVolume),
      })
      refreshSummary(data)
      pushActivity({ type: 'water', detail: `${hydrationVolume} ml hydration` })
    })
  }

  const handleAddSnack = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    guardedAction(async () => {
      const data = await jsonRequest<BacSummary>('/snacks/add', {
        session_id: sessionId,
        snack_type: snackType,
        modifier: Number(snackModifier),
      })
      refreshSummary(data)
      pushActivity({ type: 'snack', detail: `${snackType} · modifier ${snackModifier.toFixed(2)}` })
    })
  }

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`${API_BASE}/analyze-cocktail`, { method: 'POST', body: formData })
      if (!res.ok) {
        const message = await res.text()
        throw new Error(message || 'Image analysis failed')
      }
      const data = (await res.json()) as AiDrinkPrediction
      setPendingAiDrink(data)
      setStatus('AI suggestion ready')
      pushActivity({
        type: 'ai',
        detail: `${data.ai_drink_type} · ${data.ai_volume_ml} ml · ${data.ai_abv_percent}%`,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image analysis failed')
    } finally {
      setLoading(false)
      event.target.value = ''
    }
  }

  const handleAddAiDrinkToSession = () => {
    if (!pendingAiDrink) return
    guardedAction(async () => {
      const data = await jsonRequest<BacSummary>('/drinks/add', {
        session_id: sessionId,
        volume_ml: Number(pendingAiDrink.ai_volume_ml),
        abv_percent: Number(pendingAiDrink.ai_abv_percent),
      })
      refreshSummary(data)
      pushActivity({ type: 'drink', detail: `${pendingAiDrink.ai_drink_type} (AI)` })
      setPendingAiDrink(null)
    })
  }

  const riskLevel = useMemo(() => {
    if (!summary) return 'idle'
    if (summary.bac < 0.03) return 'safe'
    if (summary.bac < 0.08) return 'caution'
    return 'danger'
  }, [summary])

  const riskMessage = useMemo(() => {
    switch (riskLevel) {
      case 'caution':
        return 'Hydrate & slow down a bit.'
      case 'danger':
        return 'Pause drinking immediately and rest.'
      case 'safe':
        return 'You are in a comfortable zone.'
      default:
        return 'Log a drink to see guidance.'
    }
  }, [riskLevel])

  const intoxicationPercent = useMemo(() => {
    if (!summary) return 0
    const percent = (summary.bac / 0.25) * 100
    return clamp(percent, 0, 100)
  }, [summary])

  const paceScore = useMemo(() => computePaceScore(drinkMoments), [drinkMoments])
  const paceLabel = useMemo(() => paceFromScore(paceScore), [paceScore])
  const pacePercent = clamp(paceScore / 10, 0, 1) * 100

  const characterState = useMemo(() => {
    if (intoxicationPercent < 30) {
      return { emoji: '🙂', label: 'Relaxed explorer', description: riskMessage }
    }
    if (intoxicationPercent < 65) {
      return { emoji: '😅', label: 'Tipsy adventurer', description: riskMessage }
    }
    return { emoji: '😵', label: 'Critical zone', description: riskMessage }
  }, [intoxicationPercent, riskMessage])

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand-intro">
          <p className="eyebrow">Drinkable · AI guided</p>
          <h1>Personal BAC Coach</h1>
          <p>Track drinks, hydration, and smart breaks with one polished dashboard.</p>
        </div>
        <div className="session-card">
          <div className="session-top">
            <p className="label">Session ID</p>
            <code>{sessionId || 'Starting…'}</code>
          </div>
          <div className="session-actions">
            <button onClick={() => startSession({ reset: true })} disabled={loading}>
              Restart session
            </button>
            <button
              className="ghost"
              type="button"
              disabled={!sessionId}
              onClick={() => sessionId && navigator.clipboard.writeText(sessionId)}
            >
              Copy
            </button>
          </div>
          {status && <span className="status-text">{status}</span>}
          {error && <span className="error-text">{error}</span>}
        </div>
      </header>

      <section className="card highlight-card">
        <div className="character-row">
          <div className="character-avatar" aria-hidden>
            {characterState.emoji}
          </div>
          <div>
            <p className="eyebrow">Current status</p>
            <h2>{characterState.label}</h2>
            <p className="muted">{characterState.description}</p>
          </div>
          <div className={`risk-tag risk-${riskLevel}`}>
            <span>{summary ? summary.bac.toFixed(3) : '0.000'} BAC</span>
            <small>{Math.round(intoxicationPercent)}% intoxication</small>
          </div>
        </div>
        <div className="highlight-grid">
          <article>
            <p className="eyebrow">Rest recommendation</p>
            <strong>{summary ? `${summary.rest_minutes} min` : '—'}</strong>
            <span>Baseline {summary ? summary.baseline_rest_minutes.toFixed(1) : '—'} min</span>
          </article>
          <article>
            <p className="eyebrow">Hydration logged</p>
            <strong>{summary ? `${summary.hydration_score.toFixed(0)} ml` : '—'}</strong>
            <span>Modifier ×{summary ? summary.hydration_modifier.toFixed(2) : '1.00'}</span>
          </article>
          <article>
            <p className="eyebrow">Snack modifier</p>
            <strong>×{summary ? summary.snack_modifier.toFixed(2) : '1.00'}</strong>
            <span>Hours since start {summary ? summary.hours_since_start.toFixed(2) : '—'}</span>
          </article>
        </div>
      </section>

      <div className="content-grid">
        <div className="primary-stack">
          <section className="card trend-card">
            <div className="card-header">
              <div>
                <p className="eyebrow">BAC trend</p>
                <h3>{summary ? summary.bac.toFixed(3) : '0.000'}% BAC</h3>
                <p className="muted">Updated whenever you log something.</p>
              </div>
              <div className="pace-chip">
                <span>{paceLabel === 'fast' ? 'Fast pace' : paceLabel === 'normal' ? 'Normal pace' : 'Slow pace'}</span>
                <strong>{paceScore.toFixed(1)} / 10</strong>
              </div>
            </div>
            <div className="chart-wrapper">
              <TrendChart history={bacHistory.length >= 2 ? bacHistory : mockHistory(summary?.bac ?? 0)} />
            </div>
            <div className="pace-track">
              <div className="track">
                <span style={{ left: `${pacePercent}%` }} />
              </div>
              <div className="track-labels">
                <span>Slow</span>
                <span>Normal</span>
                <span>Fast</span>
              </div>
            </div>
          </section>

          <section className="card log-card">
            <div className="log-grid">
              <form onSubmit={handleAddDrink} className="log-form">
                <div>
                  <p className="eyebrow">Add drink</p>
                  <h3>Manual entry</h3>
                </div>
                <div className="fields">
                  <label>
                    Volume (ml)
                    <input
                      type="number"
                      min={10}
                      value={drinkVolume}
                      onChange={(e) => setDrinkVolume(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    ABV (%)
                    <input
                      type="number"
                      step={0.1}
                      min={0}
                      value={drinkAbv}
                      onChange={(e) => setDrinkAbv(Number(e.target.value))}
                    />
                  </label>
                </div>
                <button className="primary" type="submit">
                  Log drink
                </button>
              </form>

              <div className="ai-panel">
                <div>
                  <p className="eyebrow">Cocktail vision</p>
                  <h3>Upload a photo</h3>
                </div>
                <label className="upload-tile">
                  <input type="file" accept="image/*" onChange={handleImageUpload} />
                  <span>Drop or click to upload</span>
                </label>
                {pendingAiDrink ? (
                  <div className="ai-result">
                    <div>
                      <p className="muted">AI detected</p>
                      <strong>{pendingAiDrink.ai_drink_type}</strong>
                    </div>
                    <p>
                      {pendingAiDrink.ai_volume_ml} ml · {pendingAiDrink.ai_abv_percent}% ·
                      &nbsp;{(pendingAiDrink.ai_confidence * 100).toFixed(0)}% confidence
                    </p>
                    <button className="primary" type="button" onClick={handleAddAiDrinkToSession}>
                      Add this drink
                    </button>
                  </div>
                ) : (
                  <p className="muted">AI will suggest volume & ABV before you commit.</p>
                )}
              </div>
            </div>

            <div className="log-grid secondary">
              <form onSubmit={handleAddHydration} className="log-form compact">
                <div>
                  <p className="eyebrow">Hydration</p>
                  <h3>Add water</h3>
                </div>
                <label>
                  Water (ml)
                  <input
                    type="number"
                    min={50}
                    value={hydrationVolume}
                    onChange={(e) => setHydrationVolume(Number(e.target.value))}
                  />
                </label>
                <button className="primary" type="submit">
                  Log water
                </button>
              </form>

              <form onSubmit={handleAddSnack} className="log-form compact">
                <div>
                  <p className="eyebrow">Snacks</p>
                  <h3>Pace modifiers</h3>
                </div>
                <label>
                  Description
                  <input type="text" value={snackType} onChange={(e) => setSnackType(e.target.value)} />
                </label>
                <label>
                  Modifier (0.8 ~ 1.2)
                  <input
                    type="number"
                    step={0.05}
                    min={0.5}
                    max={1.5}
                    value={snackModifier}
                    onChange={(e) => setSnackModifier(Number(e.target.value))}
                  />
                </label>
                <button className="primary" type="submit">
                  Log snack
                </button>
              </form>
            </div>
          </section>
        </div>

        <aside className="secondary-stack">
          <section className="card timeline-card">
            <div className="card-header">
              <div>
                <p className="eyebrow">Activity timeline</p>
                <h3>Latest actions</h3>
              </div>
            </div>
            {activity.length === 0 ? (
              <p className="muted">Waiting for your first log…</p>
            ) : (
              <ul className="timeline-list">
                {activity.map((entry) => (
                  <li key={entry.id}>
                    <div>
                      <span className={`chip chip-${entry.type}`}>{entry.type}</span>
                      <p>{entry.detail}</p>
                    </div>
                    <time>{new Date(entry.timestamp).toLocaleTimeString()}</time>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {loading && <p className="muted">Processing…</p>}
        </aside>
      </div>
    </main>
  )
}

export default App


// test