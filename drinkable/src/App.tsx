import { useMemo, useState } from 'react'
import './App.css'

const ETHANOL_DENSITY = 0.789 // g/ml
const ELIMINATION_RATE_PER_HOUR = 0.015
const TARGET_BAC = 0.05
const HYDRATION_DECAY_MINUTES = 60
const SNACK_EFFECT_WINDOW_MINUTES = 90

const beverageCatalog = [
  { id: 'beer', label: 'Beer', abv: 5 },
  { id: 'wine', label: 'Wine', abv: 12 },
  { id: 'soju', label: 'Soju', abv: 16.9 },
  { id: 'makgeolli', label: 'Makgeolli', abv: 6 },
  { id: 'whisky', label: 'Whisky', abv: 40 },
  { id: 'vodka', label: 'Vodka', abv: 40 },
  { id: 'gin', label: 'Gin', abv: 40 },
  { id: 'rum', label: 'Rum', abv: 40 },
  { id: 'tequila', label: 'Tequila', abv: 40 },
  { id: 'brandy', label: 'Brandy', abv: 40 },
]

const containerCatalog = [
  { id: 'standard-shot', label: 'Standard shot (44 ml)', ml: 44 },
  { id: 'soju-shot', label: 'Soju shot (50 ml)', ml: 50 },
  { id: 'beer-glass', label: 'Beer glass (355 ml)', ml: 355 },
  { id: 'red-cup', label: 'Red cup (450 ml)', ml: 450 },
  { id: 'wine-glass', label: 'Wine glass (150 ml)', ml: 150 },
  { id: 'bottle', label: 'Bottle / can (500 ml)', ml: 500 },
]

const bodyWaterOptions = [
  { id: 'male', label: 'Body type: Male', ratio: 0.68 },
  { id: 'female', label: 'Body type: Female', ratio: 0.55 },
  { id: 'custom', label: 'Custom ratio', ratio: 0.6 },
]

const waterOptions = [
  { id: 'glass-200', label: 'Water glass (200 ml)', ml: 200 },
  { id: 'bottle-330', label: 'Small bottle (330 ml)', ml: 330 },
  { id: 'bottle-500', label: 'Sport bottle (500 ml)', ml: 500 },
]

const snackOptions = [
  {
    id: 'light-snack',
    label: 'Light snack (chips / nuts)',
    absorptionModifier: 0.95,
    description: 'Small bite that slows the spike just a little.',
  },
  {
    id: 'carb-heavy',
    label: 'Carb-heavy snack (fries / bread)',
    absorptionModifier: 0.9,
    description: 'Adds a mild buffer to absorption.',
  },
  {
    id: 'full-meal',
    label: 'Full meal (protein + fat)',
    absorptionModifier: 0.85,
    description: 'Best for smoothing out BAC climbs.',
  },
]

interface DrinkEntry {
  id: string
  beverageId: string
  containerId: string
  quantity: number
  timestamp: string
  volumeMl: number
  abv: number
  alcoholGrams: number
}

interface ToleranceEntry {
  id: string
  beverageId: string
  containerId: string
  quantity: number
  volumeMl: number
  abv: number
  alcoholGrams: number
}

interface HydrationEntry {
  id: string
  waterId: string
  quantity: number
  volumeMl: number
  timestamp: string
}

interface SnackEntry {
  id: string
  snackId: string
  quantity: number
  timestamp: string
}

const toDateTimeInputValue = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

const formatClock = (isoString: string) => {
  const parsed = new Date(isoString)
  if (Number.isNaN(parsed.getTime())) {
    return '-'
  }

  return parsed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

const bacBadge = (bac: number) => {
  if (bac === 0) {
    return 'Waiting for first entry'
  }
  if (bac < 0.03) {
    return 'Comfort zone'
  }
  if (bac < 0.06) {
    return 'Caution'
  }
  if (bac < 0.09) {
    return 'Fast climb'
  }
  return 'Danger'
}

const minutesBetween = (timestamp: string) => {
  const parsed = new Date(timestamp)
  if (Number.isNaN(parsed.getTime())) {
    return Infinity
  }
  return (Date.now() - parsed.getTime()) / (1000 * 60)
}

const paceBadge = (paceMinutes: number) => {
  if (!paceMinutes || paceMinutes === Infinity) {
    return 'Not enough data'
  }
  if (paceMinutes < 12) {
    return 'Critical pace'
  }
  if (paceMinutes < 20) {
    return 'Fast'
  }
  return 'Steady'
}

function App() {
  const defaultStart = () => {
    const base = new Date()
    base.setMinutes(base.getMinutes() - 15)
    return toDateTimeInputValue(base)
  }

  const [weightKg, setWeightKg] = useState(70)
  const [bodyType, setBodyType] = useState(bodyWaterOptions[0].id)
  const [customRatio, setCustomRatio] = useState(0.6)
  const [toleranceNote, setToleranceNote] = useState('About one bottle of soju')
  const [toleranceEntries, setToleranceEntries] = useState<ToleranceEntry[]>([])
  const [toleranceBeverage, setToleranceBeverage] = useState(beverageCatalog[0].id)
  const [toleranceContainer, setToleranceContainer] = useState(containerCatalog[0].id)
  const [toleranceQuantity, setToleranceQuantity] = useState(1)
  const [sessionStart, setSessionStart] = useState(defaultStart)
  const [hydrationEntries, setHydrationEntries] = useState<HydrationEntry[]>([])
  const [selectedWater, setSelectedWater] = useState(waterOptions[0].id)
  const [waterQuantity, setWaterQuantity] = useState(1)
  const [snackEntries, setSnackEntries] = useState<SnackEntry[]>([])
  const [selectedSnack, setSelectedSnack] = useState(snackOptions[0].id)
  const [snackQuantity, setSnackQuantity] = useState(1)
  const [selectedBeverage, setSelectedBeverage] = useState(beverageCatalog[0].id)
  const [selectedContainer, setSelectedContainer] = useState(containerCatalog[0].id)
  const [quantity, setQuantity] = useState(1)
  const [drinks, setDrinks] = useState<DrinkEntry[]>([])

  const distributionRatio = useMemo(() => {
    if (bodyType === 'custom') {
      return Math.min(0.85, Math.max(0.4, customRatio))
    }

    return (
      bodyWaterOptions.find((option) => option.id === bodyType)?.ratio ??
      bodyWaterOptions[0].ratio
    )
  }, [bodyType, customRatio])

  const startDate = useMemo(() => {
    const parsed = new Date(sessionStart)
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed
  }, [sessionStart])

  const hoursSinceStart = useMemo(() => {
    const diff = Date.now() - startDate.getTime()
    return diff > 0 ? diff / (1000 * 60 * 60) : 0
  }, [startDate])

  const totals = useMemo(() => {
    return drinks.reduce(
      (acc, drink) => {
        acc.alcoholGrams += drink.alcoholGrams
        acc.volumeMl += drink.volumeMl
        acc.drinkUnits += drink.quantity
        return acc
      },
      { alcoholGrams: 0, volumeMl: 0, drinkUnits: 0 }
    )
  }, [drinks])

  const weightGrams = Math.max(1, weightKg * 1000)
  const bacBeforeElimination =
    totals.alcoholGrams > 0
      ? (totals.alcoholGrams / (weightGrams * distributionRatio)) * 100
      : 0

  const bac = Math.max(
    0,
    bacBeforeElimination - ELIMINATION_RATE_PER_HOUR * hoursSinceStart
  )

  const paceMinutes = totals.drinkUnits
    ? (hoursSinceStart * 60) / totals.drinkUnits
    : Infinity

  const bacProgress = Math.min(100, (bac / 0.2) * 100)
  const minutesToTarget =
    bac > TARGET_BAC
      ? Math.ceil(((bac - TARGET_BAC) / ELIMINATION_RATE_PER_HOUR) * 60)
      : 0
  const minutesForThirtyPercentDrop = bac
    ? Math.ceil(((bac * 0.3) / ELIMINATION_RATE_PER_HOUR) * 60)
    : 0

  const latestDrink = drinks[0]
  const calcBacImpact = (alcoholGrams: number) => {
    return (alcoholGrams / (weightGrams * distributionRatio)) * 100
  }
  const minutesForLatestDrink = latestDrink
    ? Math.ceil(
        (calcBacImpact(latestDrink.alcoholGrams) / ELIMINATION_RATE_PER_HOUR) *
          60
      )
    : 0

  const toleranceTotals = useMemo(() => {
    return toleranceEntries.reduce(
      (acc, entry) => {
        acc.alcoholGrams += entry.alcoholGrams
        acc.volumeMl += entry.volumeMl
        acc.drinkUnits += entry.quantity
        return acc
      },
      { alcoholGrams: 0, volumeMl: 0, drinkUnits: 0 }
    )
  }, [toleranceEntries])

  const toleranceBac = toleranceTotals.alcoholGrams
    ? calcBacImpact(toleranceTotals.alcoholGrams)
    : 0

  const drinkTimeline = useMemo(() => {
    if (drinks.length === 0) {
      return []
    }

    const sorted = [...drinks].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    let cumulativeAlcohol = 0
    return sorted.map((entry) => {
      cumulativeAlcohol += entry.alcoholGrams
      const entryTime = new Date(entry.timestamp)
      const hoursElapsed = Math.max(
        0,
        (entryTime.getTime() - startDate.getTime()) / (1000 * 60 * 60)
      )
      const bacBefore = (cumulativeAlcohol / (weightGrams * distributionRatio)) * 100
      const bacValue = Math.max(0, bacBefore - ELIMINATION_RATE_PER_HOUR * hoursElapsed)
      return {
        minutes: hoursElapsed * 60,
        bac: bacValue,
      }
    })
  }, [drinks, startDate, weightGrams, distributionRatio])

  const paceGraph = useMemo(() => {
    if (drinkTimeline.length === 0) {
      return {
        points: '',
        areaPath: '',
        maxMinutes: 60,
        maxBac: 0.08,
        latestBac: 0,
      }
    }

    const maxMinutes = Math.max(60, ...drinkTimeline.map((point) => point.minutes))
    const maxBac = Math.max(0.08, ...drinkTimeline.map((point) => point.bac))

    const coords = drinkTimeline.map((point) => {
      const x = (point.minutes / maxMinutes) * 100
      const y = 100 - (point.bac / maxBac) * 100
      return { x, y }
    })

    const points = coords.map((coord) => `${coord.x},${coord.y}`).join(' ')
    const areaPath = ['M0,100', ...coords.map((coord) => `L${coord.x},${coord.y}`), 'L100,100 Z'].join(' ')

    return {
      points,
      areaPath,
      maxMinutes,
      maxBac,
      latestBac: drinkTimeline[drinkTimeline.length - 1]?.bac ?? 0,
    }
  }, [drinkTimeline])

  const hydrationTotals = useMemo(() => {
    return hydrationEntries.reduce(
      (acc, entry) => {
        acc.volumeMl += entry.volumeMl
        acc.occurrences += entry.quantity
        return acc
      },
      { volumeMl: 0, occurrences: 0 }
    )
  }, [hydrationEntries])

  const hydrationScore = useMemo(() => {
    return hydrationEntries.reduce((acc, entry) => {
      const minutesAgo = minutesBetween(entry.timestamp)
      if (minutesAgo > HYDRATION_DECAY_MINUTES) {
        return acc
      }
      const weight = Math.max(0, 1 - minutesAgo / HYDRATION_DECAY_MINUTES)
      return acc + entry.volumeMl * weight
    }, 0)
  }, [hydrationEntries])

  const recentSnack = snackEntries[0]
  const minutesSinceSnack = recentSnack ? minutesBetween(recentSnack.timestamp) : Infinity
  const snackCatalogEntry = recentSnack
    ? snackOptions.find((item) => item.id === recentSnack.snackId)
    : undefined
  const snackEffectActive = minutesSinceSnack <= SNACK_EFFECT_WINDOW_MINUTES
  const snackRestModifier = snackEffectActive
    ? snackCatalogEntry?.absorptionModifier ?? 1
    : 1

  const hydrationRestModifier = hydrationScore >= 800 ? 0.9 : hydrationScore >= 400 ? 1 : 1.15

  const aiRestMinutes = minutesForThirtyPercentDrop
    ? Math.max(
        1,
        Math.round(minutesForThirtyPercentDrop * hydrationRestModifier * snackRestModifier)
      )
    : 0

  const hydrationInsight = (() => {
    if (hydrationEntries.length === 0) {
      return 'No water logged yet. Add at least 200 ml before your next drink.'
    }
    if (hydrationScore >= 800) {
      return 'Hydration looks excellent—keep sipping water every ~20 minutes.'
    }
    if (hydrationScore >= 400) {
      return 'Solid hydration, but another glass soon will keep things smooth.'
    }
    return 'Hydration is lagging. Log a full glass to slow the next BAC bump.'
  })()

  const snackInsight = (() => {
    if (!recentSnack) {
      return 'No snack data yet. A quick bite can slow absorption spikes by 5–15%.'
    }
    const label = snackCatalogEntry?.label ?? 'Snack'
    if (snackEffectActive) {
      return `${label} ${Math.round(minutesSinceSnack)} min ago is buffering your current climb (~${Math.round(
        (1 - snackRestModifier) * 100
      )}% slower).`
    }
    return `${label} was logged ${Math.round(
      minutesSinceSnack
    )} min ago. Add another bite if you plan to keep drinking.`
  })()

  const handleAddDrink = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const beverage = beverageCatalog.find((item) => item.id === selectedBeverage)
    const container = containerCatalog.find(
      (item) => item.id === selectedContainer
    )

    if (!beverage || !container || quantity <= 0) {
      return
    }

    const volumeMl = container.ml * quantity
    const alcoholMl = volumeMl * (beverage.abv / 100)
    const alcoholGrams = alcoholMl * ETHANOL_DENSITY

    const entry: DrinkEntry = {
      id: crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      beverageId: beverage.id,
      containerId: container.id,
      quantity,
      timestamp: new Date().toISOString(),
      volumeMl,
      abv: beverage.abv,
      alcoholGrams,
    }

    setDrinks((prev) => [entry, ...prev])
  }

  const handleAddHydration = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const option = waterOptions.find((item) => item.id === selectedWater)
    if (!option || waterQuantity <= 0) {
      return
    }

    const volumeMl = option.ml * waterQuantity
    const entry: HydrationEntry = {
      id: crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      waterId: option.id,
      quantity: waterQuantity,
      volumeMl,
      timestamp: new Date().toISOString(),
    }

    setHydrationEntries((prev) => [entry, ...prev])
  }

  const handleRemoveHydration = (id: string) => {
    setHydrationEntries((prev) => prev.filter((entry) => entry.id !== id))
  }

  const handleAddTolerance = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const beverage = beverageCatalog.find((item) => item.id === toleranceBeverage)
    const container = containerCatalog.find(
      (item) => item.id === toleranceContainer
    )

    if (!beverage || !container || toleranceQuantity <= 0) {
      return
    }

    const volumeMl = container.ml * toleranceQuantity
    const alcoholMl = volumeMl * (beverage.abv / 100)
    const alcoholGrams = alcoholMl * ETHANOL_DENSITY

    const entry: ToleranceEntry = {
      id: crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      beverageId: beverage.id,
      containerId: container.id,
      quantity: toleranceQuantity,
      volumeMl,
      abv: beverage.abv,
      alcoholGrams,
    }

    setToleranceEntries((prev) => [entry, ...prev])
  }

  const handleRemoveTolerance = (id: string) => {
    setToleranceEntries((prev) => prev.filter((entry) => entry.id !== id))
  }

  const clearToleranceList = () => setToleranceEntries([])

  const handleAddSnack = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const snack = snackOptions.find((item) => item.id === selectedSnack)
    if (!snack || snackQuantity <= 0) {
      return
    }

    const entry: SnackEntry = {
      id: crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      snackId: snack.id,
      quantity: snackQuantity,
      timestamp: new Date().toISOString(),
    }

    setSnackEntries((prev) => [entry, ...prev])
  }

  const handleRemoveSnack = (id: string) => {
    setSnackEntries((prev) => prev.filter((entry) => entry.id !== id))
  }

  const clearHydrationList = () => setHydrationEntries([])
  const clearSnackList = () => setSnackEntries([])

  const resetSession = () => {
    setDrinks([])
    setSessionStart(defaultStart())
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="tag">Hackathon Lab · BAC tracker</p>
          <h1>Drinkable BAC Dashboard</h1>
          <p className="subtitle">
            Track every drink, estimate your BAC in real time, and get nudges for safer
            pacing during the night.
          </p>
        </div>
        <button className="ghost" onClick={resetSession}>
          Reset session
        </button>
      </header>

      <section className="status-card">
        <div className="status-header">
          <div>
            <p className="label">Current estimated BAC</p>
            <div className="bac-value">{bac.toFixed(3)}</div>
            <p className="status-text">{bacBadge(bac)}</p>
          </div>
          <div className="status-meter">
            <div className="meter">
              <div className="meter-fill" style={{ width: `${bacProgress}%` }} />
            </div>
            <p className="meter-note">
              {bac >= TARGET_BAC
                ? `Roughly ${minutesToTarget} min until you drop below the caution line`
                : 'Still below the caution line'}
            </p>
          </div>
        </div>

        <div className="metrics-grid">
          <div className="metric-card">
            <p className="label">Total drinks</p>
            <p className="metric-value">{totals.drinkUnits.toFixed(1)} servings</p>
            <span className="chip">About {Math.round(totals.volumeMl)} ml</span>
          </div>
          <div className="metric-card">
            <p className="label">Session length</p>
            <p className="metric-value">
              {hoursSinceStart < 0.1
                ? 'Just getting started'
                : `${hoursSinceStart.toFixed(2)} h`}
            </p>
            <span className="chip">Started at {formatClock(startDate.toISOString())}</span>
          </div>
          <div className="metric-card">
            <p className="label">Current pace</p>
            <p className="metric-value">{paceBadge(paceMinutes)}</p>
            <span className="chip">
              {paceMinutes === Infinity
                ? 'Log your first drink'
                : `${paceMinutes.toFixed(0)} min/drink`}
            </span>
          </div>
        </div>

        {bac > 0 && (
          <div className="coaching">
            <div>
              <p>AI Coaching</p>
              <h3>
                {aiRestMinutes
                  ? `Rest ${aiRestMinutes} min (hydration/snack adjusted) to slow your BAC climb by ~30%.`
                  : 'Keep logging drinks to unlock pacing advice.'}
              </h3>
              {minutesForThirtyPercentDrop > 0 && (
                <p className="fine-print">
                  Baseline rest without modifiers: {minutesForThirtyPercentDrop} min
                </p>
              )}
            </div>
            <div>
              {minutesForLatestDrink > 0 ? (
                <p>Waiting at least {minutesForLatestDrink} min before the next drink keeps things safer.</p>
              ) : (
                <p>Log your first drink to unlock personalized pacing tips.</p>
              )}
            </div>
            <div className="coaching-grid">
              <div className="coaching-card">
                <h4>Hydration insight</h4>
                <p>{hydrationInsight}</p>
                <span className="chip">Active water score: {Math.round(hydrationScore)} ml</span>
              </div>
              <div className="coaching-card">
                <h4>Snack insight</h4>
                <p>{snackInsight}</p>
                <span className="chip">
                  {recentSnack
                    ? `Last snack ${Math.round(minutesSinceSnack)} min ago`
                    : 'No snack logged yet'}
                </span>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="panel graph-card">
        <div className="graph-header">
          <div>
            <h2>Live pace graph</h2>
            <p className="panel-desc">
              Visualize BAC estimates per drink to understand how fast the session is escalating.
            </p>
          </div>
          <div className="graph-meta">
            <div>
              <p className="label">Projected max BAC</p>
              <p className="metric-value">{paceGraph.latestBac.toFixed(3)}</p>
            </div>
            <div>
              <p className="label">Latest pace</p>
              <p className="metric-value">
                {paceMinutes === Infinity ? '—' : `${paceMinutes.toFixed(0)} min/drink`}
              </p>
            </div>
          </div>
        </div>
        {drinkTimeline.length < 2 ? (
          <div className="empty-state">
            Need at least two drinks to draw the trend. Keep logging!
          </div>
        ) : (
          <div className="graph-wrapper">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="graph-svg">
              <path d={paceGraph.areaPath} className="graph-area" />
              <polyline points={paceGraph.points} className="graph-line" />
            </svg>
            <div className="graph-scale">
              <span>0 min</span>
              <span>{Math.round(paceGraph.maxMinutes)} min</span>
            </div>
            <div className="graph-scale vertical">
              <span>{paceGraph.maxBac.toFixed(2)} BAC</span>
              <span>0</span>
            </div>
          </div>
        )}
      </section>

      <div className="panels-grid">
        <section className="panel">
          <h2>My baseline</h2>
          <p className="panel-desc">Add body metrics and map your typical tolerance to fine tune the estimator.</p>
          <div className="input-grid">
            <label>
              Weight (kg)
              <input
                type="number"
                min={40}
                max={130}
                value={weightKg}
                onChange={(event) => setWeightKg(Number(event.target.value) || 0)}
              />
            </label>
            <label>
              Session start
              <input
                type="datetime-local"
                value={sessionStart}
                onChange={(event) => setSessionStart(event.target.value)}
              />
            </label>
            <label>
              Body type / water ratio
              <select
                value={bodyType}
                onChange={(event) => setBodyType(event.target.value)}
              >
                {bodyWaterOptions.map((option) => (
                  <option value={option.id} key={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {bodyType === 'custom' && (
              <label>
                Water ratio (0.4 ~ 0.85)
                <input
                  type="number"
                  min={0.4}
                  max={0.85}
                  step={0.01}
                  value={customRatio}
                  onChange={(event) =>
                    setCustomRatio(Number(event.target.value) || 0.6)
                  }
                />
              </label>
            )}
            <label className="full-width">
              Tolerance / condition note
              <input
                type="text"
                value={toleranceNote}
                onChange={(event) => setToleranceNote(event.target.value)}
                placeholder="e.g. 1 bottle soju + 2 beers"
              />
            </label>
          </div>
          <p className="note">Tonight's note: {toleranceNote || 'Waiting for input'}</p>

          <div className="tolerance-section">
            <div className="tolerance-header">
              <div>
                <h3>Structured tolerance log</h3>
                <p className="panel-desc small">
                  Use the same selectors as the drink tracker to capture your usual mix.
                </p>
              </div>
              {toleranceEntries.length > 0 && (
                <button className="ghost small" type="button" onClick={clearToleranceList}>
                  Clear list
                </button>
              )}
            </div>
            <form onSubmit={handleAddTolerance} className="input-grid compact-grid">
              <label>
                Beverage
                <select
                  value={toleranceBeverage}
                  onChange={(event) => setToleranceBeverage(event.target.value)}
                >
                  {beverageCatalog.map((beverage) => (
                    <option value={beverage.id} key={beverage.id}>
                      {beverage.label} · {beverage.abv}% ABV
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Container size
                <select
                  value={toleranceContainer}
                  onChange={(event) => setToleranceContainer(event.target.value)}
                >
                  {containerCatalog.map((container) => (
                    <option value={container.id} key={container.id}>
                      {container.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Servings
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={toleranceQuantity}
                  onChange={(event) =>
                    setToleranceQuantity(Number(event.target.value) || 0)
                  }
                />
              </label>
              <button className="primary" type="submit">
                Add to tolerance
              </button>
            </form>

            {toleranceEntries.length === 0 ? (
              <p className="note">No tolerance recipe yet. Add a few drinks to describe your usual capacity.</p>
            ) : (
              <div className="tolerance-summary">
                <p>
                  Typical night: {toleranceTotals.drinkUnits.toFixed(1)} servings · ~
                  {Math.round(toleranceTotals.volumeMl)} ml · Alcohol{' '}
                  {toleranceTotals.alcoholGrams.toFixed(1)} g
                </p>
                <span className="chip">
                  Estimated peak BAC ≈ {toleranceBac.toFixed(3)}
                </span>
              </div>
            )}

            {toleranceEntries.length > 0 && (
              <ul className="history-list tolerance-list">
                {toleranceEntries.map((entry) => {
                  const beverage = beverageCatalog.find(
                    (item) => item.id === entry.beverageId
                  )
                  const container = containerCatalog.find(
                    (item) => item.id === entry.containerId
                  )
                  return (
                    <li key={entry.id}>
                      <div>
                        <strong>{beverage?.label ?? 'Beverage'}</strong> · {container?.label}
                        <p className="detail">
                          {entry.quantity} servings · {entry.volumeMl.toFixed(0)} ml · Alcohol{' '}
                          {entry.alcoholGrams.toFixed(1)} g
                        </p>
                      </div>
                      <button
                        type="button"
                        className="ghost tiny"
                        onClick={() => handleRemoveTolerance(entry.id)}
                      >
                        Remove
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </section>

        <section className="panel">
          <h2>Add a drink</h2>
          <p className="panel-desc">Pick beverage, container, and servings to log instantly.</p>
          <form onSubmit={handleAddDrink} className="input-grid">
            <label>
              Beverage
              <select
                value={selectedBeverage}
                onChange={(event) => setSelectedBeverage(event.target.value)}
              >
                {beverageCatalog.map((beverage) => (
                  <option value={beverage.id} key={beverage.id}>
                    {beverage.label} · {beverage.abv}% ABV
                  </option>
                ))}
              </select>
            </label>
            <label>
              Container size
              <select
                value={selectedContainer}
                onChange={(event) => setSelectedContainer(event.target.value)}
              >
                {containerCatalog.map((container) => (
                  <option value={container.id} key={container.id}>
                    {container.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Servings
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value) || 0)}
              />
            </label>
            <button className="primary" type="submit">
              Log drink
            </button>
          </form>
          {latestDrink && (
            <div className="note">
              Last entry: {formatClock(latestDrink.timestamp)} · {latestDrink.quantity}{' '}
              servings · Alcohol {latestDrink.alcoholGrams.toFixed(1)} g
            </div>
          )}
        </section>

        <section className="panel">
          <h2>Hydration & snacks</h2>
          <p className="panel-desc">
            Capture water and bites in real time so the AI coach can react instantly.
          </p>
          <div className="split-grid">
            <div className="split-card">
              <div className="split-card-header">
                <div>
                  <h3>Water intake</h3>
                  <p className="panel-desc small">
                    Aim for 200–300 ml every 20 minutes during active drinking.
                  </p>
                </div>
                {hydrationEntries.length > 0 && (
                  <button
                    type="button"
                    className="ghost small"
                    onClick={clearHydrationList}
                  >
                    Clear water log
                  </button>
                )}
              </div>
              <form onSubmit={handleAddHydration} className="input-grid compact-grid">
                <label>
                  Container
                  <select
                    value={selectedWater}
                    onChange={(event) => setSelectedWater(event.target.value)}
                  >
                    {waterOptions.map((option) => (
                      <option value={option.id} key={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Count
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={waterQuantity}
                    onChange={(event) => setWaterQuantity(Number(event.target.value) || 0)}
                  />
                </label>
                <button className="primary" type="submit">
                  Log water
                </button>
              </form>
              {hydrationEntries.length > 0 ? (
                <>
                  <p className="note">
                    Logged {hydrationTotals.occurrences.toFixed(1)} servings · ~
                    {Math.round(hydrationTotals.volumeMl)} ml total water
                  </p>
                  <ul className="history-list tolerance-list">
                    {hydrationEntries.map((entry) => {
                      const option = waterOptions.find((item) => item.id === entry.waterId)
                      return (
                        <li key={entry.id}>
                          <div>
                            <strong>{option?.label ?? 'Water'}</strong>
                            <p className="detail">
                              {entry.quantity} servings · {entry.volumeMl.toFixed(0)} ml
                            </p>
                          </div>
                          <button
                            type="button"
                            className="ghost tiny"
                            onClick={() => handleRemoveHydration(entry.id)}
                          >
                            Remove
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </>
              ) : (
                <p className="note">No water logged yet.</p>
              )}
            </div>

            <div className="split-card">
              <div className="split-card-header">
                <div>
                  <h3>Snack buffer</h3>
                  <p className="panel-desc small">
                    Snacks help slow absorption; log them to adjust AI cues.
                  </p>
                </div>
                {snackEntries.length > 0 && (
                  <button
                    type="button"
                    className="ghost small"
                    onClick={clearSnackList}
                  >
                    Clear snack log
                  </button>
                )}
              </div>
              <form onSubmit={handleAddSnack} className="input-grid compact-grid">
                <label>
                  Snack type
                  <select
                    value={selectedSnack}
                    onChange={(event) => setSelectedSnack(event.target.value)}
                  >
                    {snackOptions.map((option) => (
                      <option value={option.id} key={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Portions
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={snackQuantity}
                    onChange={(event) => setSnackQuantity(Number(event.target.value) || 0)}
                  />
                </label>
                <button className="primary" type="submit">
                  Log snack
                </button>
              </form>
              {snackEntries.length > 0 ? (
                <>
                  <p className="note">
                    Logged {snackEntries.length} snack events in this session.
                  </p>
                  <ul className="history-list tolerance-list">
                    {snackEntries.map((entry) => {
                      const snack = snackOptions.find((item) => item.id === entry.snackId)
                      return (
                        <li key={entry.id}>
                          <div>
                            <strong>{snack?.label ?? 'Snack'}</strong>
                            <p className="detail">
                              {entry.quantity} portion(s) · {snack?.description}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="ghost tiny"
                            onClick={() => handleRemoveSnack(entry.id)}
                          >
                            Remove
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </>
              ) : (
                <p className="note">No snacks logged yet.</p>
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="panel">
        <h2>Timeline</h2>
        {drinks.length === 0 ? (
          <div className="empty-state">
            No drinks recorded yet. Add your first one!
          </div>
        ) : (
          <ul className="history-list">
            {drinks.map((drink) => {
              const beverage = beverageCatalog.find(
                (item) => item.id === drink.beverageId
              )
              const container = containerCatalog.find(
                (item) => item.id === drink.containerId
              )
              return (
                <li key={drink.id}>
                  <div>
                    <strong>{beverage?.label ?? 'Beverage'}</strong> · {container?.label}
                    <p className="detail">
                      {drink.quantity} servings · {drink.volumeMl.toFixed(0)} ml · Alcohol{' '}
                      {drink.alcoholGrams.toFixed(1)} g
                    </p>
                  </div>
                  <div className="time">{formatClock(drink.timestamp)}</div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

export default App
