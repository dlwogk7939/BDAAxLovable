import type { FriendStatus } from '../types'
import { characterLevels } from '../data/characterLevels'

interface FriendDetailScreenProps {
  friend: FriendStatus
  onBack(): void
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const FriendDetailScreen = ({ friend, onBack }: FriendDetailScreenProps) => {
  const characterLevel =
    characterLevels.find(
      (level) =>
        friend.intoxicationPercent >= level.minPercent &&
        friend.intoxicationPercent < level.maxPercent,
    ) ?? characterLevels[characterLevels.length - 1]

  const bac = ((friend.intoxicationPercent / 100) * 0.25).toFixed(3)
  const pacePercent = clamp(friend.paceScore, 0, 10) / 10
  const paceLabel = friend.paceScore <= 3 ? 'Slow' : friend.paceScore <= 6 ? 'Normal' : 'Fast'

  return (
    <div className="min-h-screen bg-backgroundSoft px-4 py-10">
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-textSecondary"
          >
            Back
          </button>
          <h1 className="text-2xl font-semibold text-textPrimary">{friend.nickname}</h1>
          <div className="w-[64px]" aria-hidden />
        </header>

        <section className="rounded-3xl bg-white p-6 shadow-card">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-brand/10 text-5xl">
              {friend.characterLevel < 4
                ? '😊'
                : friend.characterLevel < 7
                  ? '😮'
                  : '😵'}
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-textSecondary">Currently at</p>
              <p className="text-3xl font-bold text-textPrimary">
                {friend.intoxicationPercent}% intoxication
              </p>
              <p className="text-sm text-textSecondary">{characterLevel.message}</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-textSecondary">Current BAC</p>
            <p className="text-2xl font-semibold text-textPrimary">{bac}%</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-textSecondary">
            Risk level: {friend.intoxicationPercent < 30
              ? 'Safe'
              : friend.intoxicationPercent < 60
                ? 'Caution'
                : 'Danger'}
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
            Drinking pace: {paceLabel}
          </p>
        </section>
      </div>
    </div>
  )
}

export default FriendDetailScreen
