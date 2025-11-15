import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'
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
  UserProfile,
} from './types'
import { drinkTypes } from './data/drinks'

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

const friendsMock: FriendStatus[] = [
  { id: '1', nickname: 'Mia', characterLevel: 2, intoxicationPercent: 18, paceScore: 3 },
  { id: '2', nickname: 'Jordan', characterLevel: 4, intoxicationPercent: 42, paceScore: 6 },
  { id: '3', nickname: 'Leo', characterLevel: 1, intoxicationPercent: 9, paceScore: 2 },
]

type Screen = 'onboarding' | 'drinkSetup' | 'session' | 'friendsList' | 'friendDetail'

const App = () => {
  const [screen, setScreen] = useState<Screen>('onboarding')
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
  }

  const handleDrinkCountChange = (nextCount: number) => {
    setSelection((prev) => (prev ? { ...prev, count: nextCount } : prev))
    setChangeLog((prev) => {
      const updated = [...prev.slice(-3), Date.now()]
      updateBacState(nextCount, updated)
      return updated
    })
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
    setWaterGlasses(nextWater)
    if (selection) {
      updateBacState(selection.count, changeLog, nextWater)
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
  )
}

export default App
