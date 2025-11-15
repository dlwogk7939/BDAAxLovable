import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import type {
  BacHistoryPoint,
  BacState,
  DrinkSelection,
  DrinkType,
  FriendStatus,
  UserProfile,
} from '../types'
import { characterLevels } from '../data/characterLevels'

interface MainSessionScreenProps {
  profile: UserProfile
  drinkType: DrinkType
  drinkSelection: DrinkSelection
  bacState: BacState
  history: BacHistoryPoint[]
  friends: FriendStatus[]
  waterGlasses: number
  onChangeDrinkCount(count: number): void
  onChangeDrinkType(): void
  onTakePhoto(): void
  onChangeWater(count: number): void
  onOpenFriends(): void
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const Chart = ({ history }: { history: BacHistoryPoint[] }) => {
  if (!history.length) return null
  const width = 380
  const height = 140
  const maxBac = 0.25
  const points = history
    .map((point, index) => {
      const x = (index / Math.max(history.length - 1, 1)) * width
      const y = height - (point.bac / maxBac) * height
      return `${x},${clamp(y, 0, height)}`
    })
    .join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full">
      <defs>
        <linearGradient id="bacGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1F4EF5" />
          <stop offset="100%" stopColor="#83B4F9" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke="url(#bacGradient)"
        strokeWidth={6}
        strokeLinecap="round"
        points={points}
        className="drop-shadow-[0_6px_12px_rgba(31,78,245,0.25)]"
      />
    </svg>
  )
}

const formatRiskLabel = (risk: BacState['riskLevel']) => {
  if (risk === 'caution') return 'Caution'
  if (risk === 'danger') return 'Danger'
  return 'Safe'
}

export const MainSessionScreen = ({
  profile,
  drinkType,
  drinkSelection,
  bacState,
  history,
  friends,
  waterGlasses,
  onChangeDrinkCount,
  onChangeDrinkType,
  onTakePhoto,
  onChangeWater,
  onOpenFriends,
}: MainSessionScreenProps) => {
  const [showDetails, setShowDetails] = useState(false)

  const characterLevel = useMemo(() => {
    const percent = bacState.intoxicationPercent
    return (
      characterLevels.find(
        (level) => percent >= level.minPercent && percent < level.maxPercent,
      ) || characterLevels[characterLevels.length - 1]
    )
  }, [bacState.intoxicationPercent])

  const abvToUse = drinkSelection.customAbv ?? drinkType.defaultAbv
  const drinksLabel = `${drinkSelection.count} drink${drinkSelection.count === 1 ? '' : 's'}`
  const hydrationLabel = `${waterGlasses} glass${waterGlasses === 1 ? '' : 'es'}`
  const pacePercent = clamp(bacState.paceScore ?? 0, 0, 10) / 10

  const handleCountChange = (delta: number) => {
    const next = Math.max(0, drinkSelection.count + delta)
    onChangeDrinkCount(next)
  }

  const handleWaterChange = (delta: number) => {
    const next = Math.max(0, waterGlasses + delta)
    onChangeWater(next)
  }

  const alertConfig = useMemo(() => {
    if (bacState.riskLevel === 'danger') {
      return {
        title: 'High risk level',
        message:
          'Consider stopping alcohol, drink water, and stay put. Never drive or operate machinery.',
        tone: 'danger',
      }
    }
    if (bacState.paceScore >= 7) {
      return {
        title: "You’re drinking pretty fast",
        message: 'Slow down a bit and take a longer break between drinks.',
        tone: 'warning',
      }
    }
    return null
  }, [bacState.paceScore, bacState.riskLevel])

  return (
    <div className="min-h-screen bg-backgroundSoft px-4 py-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold tracking-tight text-textPrimary">Drinkable</p>
            <p className="text-sm text-textSecondary">Personal BAC coaching session</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-textSecondary">{profile.weightKg} kg · {profile.heightCm} cm</p>
            <p className="text-sm font-semibold text-textSecondary">{drinksLabel}</p>
          </div>
        </header>

        <section className="rounded-3xl bg-white p-6 shadow-card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-textSecondary">Your current status</p>
              <h2 className="text-2xl font-semibold text-textPrimary">{characterLevel.label}</h2>
              <p className="text-sm text-textSecondary">{bacState.recommendedAction}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowDetails(true)}
              className="rounded-full border border-brand px-4 py-2 text-sm font-semibold text-brand"
            >
              View details
            </button>
          </div>
          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand/10 text-4xl">
              {characterLevel.level <= 3
                ? '😊'
                : characterLevel.level < 6
                  ? '😮'
                  : '😵'}
            </div>
            <p className="text-sm text-textSecondary">
              Intoxication level {Math.round(bacState.intoxicationPercent)}%
            </p>
          </div>
        </section>

        <AnimatePresence>
          {alertConfig && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`rounded-3xl border px-5 py-4 shadow-card ${
                alertConfig.tone === 'danger'
                  ? 'border-danger/20 bg-danger/5 text-danger'
                  : 'border-amber-200 bg-amber-50 text-amber-700'
              }`}
            >
              <p className="font-semibold">{alertConfig.title}</p>
              <p className="text-sm">{alertConfig.message}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <section className="rounded-3xl bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-textSecondary">Water intake</p>
              <p className="text-xs text-textSecondary">
                Staying hydrated can help you feel better over time.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => handleWaterChange(-1)}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-2xl"
              >
                −
              </button>
              <div className="min-w-[90px] text-center">
                <p className="text-xs text-textSecondary">Logged</p>
                <p className="text-lg font-semibold text-textPrimary">{hydrationLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => handleWaterChange(1)}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-2xl text-white"
              >
                +
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-textSecondary">BAC trend</p>
              <p className="text-2xl font-semibold text-textPrimary">
                {bacState.bac.toFixed(3)} BAC
              </p>
              <p className="text-sm text-textSecondary">Updated every 15 minutes</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-textSecondary">Risk level</p>
              <p className="text-3xl font-bold text-brand">
                {Math.round(bacState.intoxicationPercent)}%
              </p>
              <p className="text-xs text-textSecondary">{formatRiskLabel(bacState.riskLevel)}</p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl bg-slate-50 p-3">
            <Chart history={history} />
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-card">
          <div className="flex items-center justify-between text-sm font-semibold text-textSecondary">
            <span>Slow</span>
            <span>Normal</span>
            <span>Fast</span>
          </div>
          <div className="relative mt-4 h-4 rounded-full bg-gradient-to-r from-brand to-brandLight">
            <div
              className="absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border-2 border-white bg-textPrimary shadow transition-all duration-200"
              style={{ left: `${pacePercent * 100}%`, transform: 'translate(-50%, -50%)' }}
            ></div>
          </div>
          <p className="mt-3 text-center text-sm font-semibold text-textSecondary">
            Drinking pace: {bacState.pace === 'slow'
              ? 'Slow'
              : bacState.pace === 'normal'
                ? 'Normal'
                : 'Fast'}
          </p>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-card space-y-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => handleCountChange(-1)}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-3xl"
              >
                −
              </button>
              <div className="text-center">
                <p className="text-sm text-textSecondary">Drinks in this session</p>
                <p className="text-4xl font-bold text-textPrimary">{drinkSelection.count}</p>
              </div>
              <button
                type="button"
                onClick={() => handleCountChange(1)}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-3xl text-white"
              >
                +
              </button>
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-textSecondary">Current drink</p>
              <p className="text-lg font-semibold text-textPrimary">
                {drinkSelection.customName ?? drinkType.name}
              </p>
              <p className="text-sm text-textSecondary">
                {abvToUse}% ABV · {Math.round(drinkSelection.volumeMl)} ml per serving
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold text-textSecondary">Total volume</p>
              <p className="text-lg font-semibold text-textPrimary">
                {(drinkSelection.count * drinkSelection.volumeMl).toLocaleString()} ml
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold text-textSecondary">Pace</p>
              <p className="text-lg font-semibold text-textPrimary">{bacState.paceScore.toFixed(1)} / 10</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold text-textSecondary">Recommendation</p>
              <p className="text-sm text-textSecondary">{bacState.recommendedAction}</p>
            </div>
          </div>
        </section>

        <div className="space-y-3">
          <button
            type="button"
            onClick={onChangeDrinkType}
            className="w-full rounded-full border border-brand bg-white px-4 py-4 text-base font-semibold text-brand"
          >
            Change drink
          </button>
          <button
            type="button"
            onClick={onTakePhoto}
            className="w-full rounded-full bg-brand px-4 py-4 text-base font-semibold text-white shadow-card"
          >
            Take drink photo
          </button>
        </div>

        {friends.length > 0 && (
          <section className="rounded-3xl bg-white p-6 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-textPrimary">Friends</h3>
              <button
                type="button"
                onClick={onOpenFriends}
                className="text-sm font-semibold text-brand"
              >
                View all
              </button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {friends.map((friend) => (
                <button
                  key={friend.id}
                  type="button"
                  onClick={onOpenFriends}
                  className="min-w-[160px] rounded-2xl border border-slate-100 p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl">
                      {friend.characterLevel < 4
                        ? '😊'
                        : friend.characterLevel < 7
                          ? '😮'
                          : '😵'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-textPrimary">{friend.nickname}</p>
                      <p className="text-xs text-textSecondary">
                        {friend.intoxicationPercent}% level
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-10 flex items-end bg-black/40 p-4"
          >
            <motion.div
              initial={{ y: 40 }}
              animate={{ y: 0 }}
              exit={{ y: 40 }}
              transition={{ duration: 0.25 }}
              className="w-full rounded-3xl bg-white p-6"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-textSecondary">Current state</p>
                  <p className="text-2xl font-semibold text-textPrimary">
                    BAC {bacState.bac.toFixed(3)} · {Math.round(bacState.intoxicationPercent)}%
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDetails(false)}
                  className="text-sm font-semibold text-textSecondary"
                >
                  Close
                </button>
              </div>
              <p className="text-sm text-textSecondary">Risk: {formatRiskLabel(bacState.riskLevel)}</p>
              <p className="mt-2 text-base font-semibold text-textPrimary">
                {characterLevel.message}
              </p>
              <p className="mt-1 text-sm text-textSecondary">{bacState.recommendedAction}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default MainSessionScreen
