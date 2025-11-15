import type { FriendStatus } from '../types'

interface FriendsListScreenProps {
  friends: FriendStatus[]
  onBack(): void
  onSelect(friend: FriendStatus): void
}

const FriendsListScreen = ({ friends, onBack, onSelect }: FriendsListScreenProps) => {
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
          <h1 className="text-2xl font-semibold text-textPrimary">Your friends</h1>
          <div className="w-[64px]" aria-hidden />
        </header>

        <div className="space-y-3">
          {friends.map((friend) => (
            <button
              key={friend.id}
              type="button"
              onClick={() => onSelect(friend)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl">
                    {friend.characterLevel < 4
                      ? '😊'
                      : friend.characterLevel < 7
                        ? '😮'
                        : '😵'}
                  </div>
                  <div>
                    <p className="text-base font-semibold text-textPrimary">{friend.nickname}</p>
                    <p className="text-xs text-textSecondary">
                      Intoxication {friend.intoxicationPercent}%
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-textSecondary">See status →</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default FriendsListScreen
