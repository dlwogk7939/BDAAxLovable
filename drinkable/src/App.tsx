import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import DrinkSetupScreen from './components/DrinkSetupScreen'
import FriendDetailScreen from './components/FriendDetailScreen'
import FriendsListScreen from './components/FriendsListScreen'
import MainSessionScreen from './components/MainSessionScreen'
import OnboardingScreen from './components/OnboardingScreen'
import type {
  BacHistoryPoint,
  BacState,
  DrinkSelection,
  DrinkType,
  FriendStatus,
  Gender,
  UserProfile,
} from './types'
import { drinkTypes } from './data/drinks'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'
const WATER_GLASS_ML = 200

interface BackendSnapshot {
  session_id: string
  user_id: string
  drink_count: number
  hydration_count: number
  snack_count: number
  bac: number
  hydration_score: number
  hydration_modifier: number
  snack_modifier: number
  baseline_rest_minutes: number
  rest_minutes: number
  hours_since_start: number
  error?: string
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const makeHistory = (bac: number, hydrationShift: number): BacHistoryPoint[] => {
  const points = 8
  const now = Date.now()
  return Array.from({ length: points }).map((_, index) => {
    const minutesAgo = (points - index - 1) * 15
    const timestamp = new Date(now - minutesAgo * 60_000).toISOString()
    const decayed = clamp(bac - minutesAgo * 0.002 - hydrationShift, 0, 0.25)
    return {
      timestamp,
      bac: Number(decayed.toFixed(3)),
      totalDrinks: Math.round(decayed / 0.02),
    }
  })
}

const recommendedMessage = (risk: BacState['riskLevel']) => {
  switch (risk) {
    case 'safe':
      return 'Keep this relaxed pace going.'
    case 'caution':
      return 'Drink some water and take a breather.'
    case 'danger':
      return 'Pause drinking and focus on recovery.'
  }
}

const computePaceScore = (timestamps: number[]) => {
  if (timestamps.length < 2) return 3
  const window = timestamps.slice(-3)
  const intervals = []
  for (let i = 1; i < window.length; i += 1) {
    intervals.push((window[i] - window[i - 1]) / 60000)
  }
  const avgMinutes = intervals.reduce((sum, n) => sum + n, 0) / intervals.length
  const score = 10 - avgMinutes * 1.5
  return clamp(Number(score.toFixed(1)), 0, 10)
}

const paceFromScore = (score: number): BacState['pace'] => {
  if (score <= 3) return 'slow'
  if (score <= 6) return 'normal'
  return 'fast'
}

const bodyRatioForGender = (gender: Gender) => {
  if (gender === 'female') return 0.55
  if (gender === 'male') return 0.68
  return 0.6
}

const friendsMock: FriendStatus[] = [
  { id: '1', nickname: 'Mia', characterLevel: 2, intoxicationPercent: 18, paceScore: 3 },
  { id: '2', nickname: 'Jordan', characterLevel: 4, intoxicationPercent: 42, paceScore: 6 },
  { id: '3', nickname: 'Leo', characterLevel: 1, intoxicationPercent: 9, paceScore: 2 },
]

type Screen = 'onboarding' | 'drinkSetup' | 'session' | 'friendsList' | 'friendDetail'

const App = () => {
  const [screen, setScreen] = useState<Screen>('onboarding')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [backendSnapshot, setBackendSnapshot] = useState<BackendSnapshot | null>(null)
  const [backendLoading, setBackendLoading] = useState(false)
  const [backendError, setBackendError] = useState<string | null>(null)
  const [userId] = useState(() => {
    const key = 'drinkable-user-id'
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null
    if (saved) return saved
    const generated = crypto.randomUUID ? crypto.randomUUID() : `user-${Date.now()}`
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, generated)
    }
    return generated
  })
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [selection, setSelection] = useState<DrinkSelection | null>(null)
  const [drinkType, setDrinkType] = useState<DrinkType | null>(null)
  const [waterGlasses, setWaterGlasses] = useState(0)
  const [selectedFriend, setSelectedFriend] = useState<FriendStatus | null>(null)
  const [bacState, setBacState] = useState<BacState>(() => ({
    bac: 0,
    intoxicationPercent: 0,
    riskLevel: 'safe',
    recommendedAction: recommendedMessage('safe'),
    pace: 'slow',
    paceScore: 3,
  }))
  const [history, setHistory] = useState<BacHistoryPoint[]>(() => makeHistory(0, 0))
  const [changeLog, setChangeLog] = useState<number[]>([])
  const friends = useMemo(() => friendsMock, [])

  const refreshBackendSnapshot = async (activeId?: string) => {
    const id = activeId ?? sessionId
    if (!id) return null
    setBackendLoading(true)
    setBackendError(null)
    try {
      const response = await fetch(`${API_BASE}/api/session/status?session_id=${id}`)
      const data = await response.json()
      if (data.error) {
        setBackendError(data.error)
        return null
      }
      setBackendSnapshot(data)
      return data as BackendSnapshot
    } catch (error) {
      console.error(error)
      setBackendError('Cannot reach backend. Is FastAPI running on port 8000?')
      return null
    } finally {
      setBackendLoading(false)
    }
  }

  const startBackendSessionIfNeeded = async (): Promise<string | null> => {
    if (sessionId) return sessionId
    if (!profile) return null

    setBackendLoading(true)
    setBackendError(null)
    try {
      const response = await fetch(`${API_BASE}/api/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          weight_kg: profile.weightKg,
          body_ratio: bodyRatioForGender(profile.gender),
        }),
      })
      const data = await response.json()
      if (!data.session_id) {
        setBackendError(data.error ?? 'Unable to start backend session')
        return null
      }
      setSessionId(data.session_id)
      await refreshBackendSnapshot(data.session_id)
      return data.session_id
    } catch (error) {
      console.error(error)
      setBackendError('Cannot reach backend. Is FastAPI running on port 8000?')
      return null
    } finally {
      setBackendLoading(false)
    }
  }

  useEffect(() => {
    if (profile && !sessionId) {
      void startBackendSessionIfNeeded()
    }
  }, [profile, sessionId])

  const logDrinkDelta = async (delta: number, currentSelection: DrinkSelection, currentType: DrinkType) => {
    if (delta <= 0) return
    const id = await startBackendSessionIfNeeded()
    if (!id) return

    setBackendLoading(true)
    setBackendError(null)
    try {
      const response = await fetch(`${API_BASE}/api/drinks/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: id,
          volume_ml: currentSelection.volumeMl * delta,
          abv_percent: currentSelection.customAbv ?? currentType.defaultAbv,
        }),
      })
      const data = await response.json()
      if (data.error) {
        setBackendError(data.error)
        return
      }
      setBackendSnapshot(data)
    } catch (error) {
      console.error(error)
      setBackendError('Failed to log drink to backend')
    } finally {
      setBackendLoading(false)
    }
  }

  const logHydrationDelta = async (delta: number) => {
    if (delta <= 0) return
    const id = await startBackendSessionIfNeeded()
    if (!id) return

    setBackendLoading(true)
    setBackendError(null)
    try {
      const response = await fetch(`${API_BASE}/api/hydration/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: id,
          volume_ml: WATER_GLASS_ML * delta,
        }),
      })
      const data = await response.json()
      if (data.error) {
        setBackendError(data.error)
        return
      }
      setBackendSnapshot(data)
    } catch (error) {
      console.error(error)
      setBackendError('Failed to log water to backend')
    } finally {
      setBackendLoading(false)
    }
  }

  const updateBacState = (count: number, timestamps: number[], water = waterGlasses) => {
    const rawBac = clamp(count * 0.02, 0, 0.25)
    const hydrationShift = Math.min(water * 0.0015, 0.02)
    const adjustedBac = clamp(rawBac - hydrationShift, 0, 0.25)
    const riskLevel: BacState['riskLevel'] = adjustedBac < 0.03 ? 'safe' : adjustedBac < 0.08 ? 'caution' : 'danger'
    const paceScore = computePaceScore(timestamps)
    setBacState({
      bac: Number(adjustedBac.toFixed(3)),
      intoxicationPercent: clamp((adjustedBac / 0.25) * 100, 0, 100),
      riskLevel,
      recommendedAction: recommendedMessage(riskLevel),
      pace: paceFromScore(paceScore),
      paceScore,
    })
    setHistory(makeHistory(adjustedBac, hydrationShift))
  }

  const handleProfileComplete = (nextProfile: UserProfile) => {
    setProfile(nextProfile)
    setScreen('drinkSetup')
  }

  const handleDrinkSetupComplete = (nextSelection: DrinkSelection) => {
    const drink = drinkTypes.find((item) => item.id === nextSelection.drinkTypeId)
    setSelection(nextSelection)
    setDrinkType(drink ?? drinkTypes[0])
    setScreen('session')
    setChangeLog([])
    updateBacState(nextSelection.count, [], waterGlasses)
    if (drink) {
      void logDrinkDelta(nextSelection.count, nextSelection, drink)
    }
  }

  const handleDrinkCountChange = (nextCount: number) => {
    const previousCount = selection?.count ?? 0
    setSelection((prev) => (prev ? { ...prev, count: nextCount } : prev))
    setChangeLog((prev) => {
      const updated = [...prev.slice(-3), Date.now()]
      updateBacState(nextCount, updated)
      return updated
    })
    if (selection && drinkType) {
      const delta = nextCount - previousCount
      if (delta > 0) {
        void logDrinkDelta(delta, selection, drinkType)
      } else if (delta < 0 && sessionId) {
        setBackendError('Backend only tracks new drinks right now.')
      }
    }
  }

  const handleChangeDrinkType = () => {
    setScreen('drinkSetup')
  }

  const handleTakePhoto = () => {
    // Placeholder - later it will open camera/AI flow
    console.info('Preparing drink photo recognition...')
  }

  const handleDrinkSetupBack = () => {
    setScreen(selection && drinkType ? 'session' : 'onboarding')
  }

  const handleWaterChange = (nextWater: number) => {
    const previous = waterGlasses
    setWaterGlasses(nextWater)
    if (selection) {
      updateBacState(selection.count, changeLog, nextWater)
    }
    const delta = nextWater - previous
    if (delta > 0) {
      void logHydrationDelta(delta)
    } else if (delta < 0 && sessionId) {
      setBackendError('Backend only tracks added water for now.')
    }
  }

  const handleOpenFriends = () => {
    setScreen('friendsList')
  }

  const handleFriendSelect = (friend: FriendStatus) => {
    setSelectedFriend(friend)
    setScreen('friendDetail')
  }

  const renderScreen = () => {
    switch (screen) {
      case 'onboarding':
        return <OnboardingScreen onComplete={handleProfileComplete} />
      case 'drinkSetup':
        return (
          <DrinkSetupScreen
            onComplete={handleDrinkSetupComplete}
            onBack={handleDrinkSetupBack}
            onPhotoRequest={handleTakePhoto}
          />
        )
      case 'session':
        if (!profile || !selection || !drinkType) return null
        return (
          <MainSessionScreen
            profile={profile}
            drinkType={drinkType}
            drinkSelection={selection}
            bacState={bacState}
            history={history}
            friends={friends}
            waterGlasses={waterGlasses}
            onChangeDrinkCount={handleDrinkCountChange}
            onChangeDrinkType={handleChangeDrinkType}
            onTakePhoto={handleTakePhoto}
            onChangeWater={handleWaterChange}
            onOpenFriends={handleOpenFriends}
          />
        )
      case 'friendsList':
        return (
          <FriendsListScreen
            friends={friends}
            onBack={() => setScreen('session')}
            onSelect={handleFriendSelect}
          />
        )
      case 'friendDetail':
        if (!selectedFriend) {
          setScreen('friendsList')
          return null
        }
        return <FriendDetailScreen friend={selectedFriend} onBack={() => setScreen('friendsList')} />
      default:
        return null
    }
  }

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          {renderScreen()}
        </motion.div>
      </AnimatePresence>

      <div className="fixed bottom-4 right-4 w-[300px] rounded-3xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-sm font-semibold text-textPrimary">Backend session</p>
          <button
            type="button"
            disabled={!sessionId || backendLoading}
            onClick={() => void refreshBackendSnapshot()}
            className="text-xs font-semibold text-brand disabled:text-slate-400"
          >
            Refresh
          </button>
        </div>
        <p className="text-xs text-textSecondary">API base: {API_BASE}</p>
        <p className="text-xs text-textSecondary">
          Session: {sessionId ? `${sessionId.slice(0, 8)}…` : 'starting...'}
        </p>

        {backendSnapshot ? (
          <div className="mt-2 space-y-1 text-sm text-textSecondary">
            <p className="text-textPrimary">
              BAC {backendSnapshot.bac.toFixed(3)} · Rest {Math.round(backendSnapshot.rest_minutes)} min
            </p>
            <p>
              Drinks {backendSnapshot.drink_count} · Water {backendSnapshot.hydration_count} · Snacks {backendSnapshot.snack_count}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-textSecondary">
            {backendError ?? (backendLoading ? 'Contacting backend...' : 'Waiting for first log...')}
          </p>
        )}
        {backendError && <p className="text-xs text-amber-600">{backendError}</p>}
      </div>
    </>
  )
}

export default App
