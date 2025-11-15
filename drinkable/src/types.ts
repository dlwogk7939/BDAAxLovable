export type Gender = 'male' | 'female' | 'other'

export interface UserProfile {
  gender: Gender
  weightKg: number
  heightCm: number
}

export type BaseDrinkCategory =
  | 'beer'
  | 'soju'
  | 'wine'
  | 'distilled'
  | 'cocktail'

export type DistilledSubType =
  | 'whiskey'
  | 'vodka'
  | 'rum'
  | 'gin'
  | 'tequila'
  | 'other'

export interface DrinkType {
  id: string
  baseCategory: BaseDrinkCategory
  name: string
  defaultAbv: number
  defaultVolumeMl: number
  distilledSubType?: DistilledSubType
}

export interface DrinkSelection {
  drinkTypeId: string
  baseCategory: BaseDrinkCategory
  customAbv?: number
  customName?: string
  photoUrl?: string
  volumeMl: number
  count: number
  distilledSubType?: DistilledSubType
}

export interface BacState {
  bac: number
  intoxicationPercent: number
  riskLevel: 'safe' | 'caution' | 'danger'
  recommendedAction: string
  pace: 'slow' | 'normal' | 'fast'
  paceScore: number // 0-10 scale for smoother UI
}

export interface BacHistoryPoint {
  timestamp: string
  bac: number
  totalDrinks: number
}

export interface FriendStatus {
  id: string
  nickname: string
  characterLevel: number // 0-9
  intoxicationPercent: number
  paceScore: number
}

export interface CharacterLevelConfig {
  level: number // 0-9
  minPercent: number
  maxPercent: number
  label: string
  message: string
}
