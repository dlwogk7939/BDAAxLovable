import type {
  BaseDrinkCategory,
  DistilledSubType,
  DrinkType,
} from '../types'

export interface BaseDrinkOption {
  id: BaseDrinkCategory
  title: string
  description: string
  icon: string
}

export const baseDrinkOptions: BaseDrinkOption[] = [
  {
    id: 'beer',
    title: 'Beer',
    description: 'Pick between 330 ml or 500 ml servings',
    icon: '🍺',
  },
  {
    id: 'soju',
    title: 'Soju',
    description: '1 shot · 60 ml · Avg. 16% ABV',
    icon: '🥃',
  },
  {
    id: 'wine',
    title: 'Wine',
    description: '1 glass · 150 ml · Avg. 12% ABV',
    icon: '🍷',
  },
  {
    id: 'distilled',
    title: 'Distilled spirits',
    description: 'Whiskey, vodka, rum, gin, tequila',
    icon: '🥃',
  },
  {
    id: 'cocktail',
    title: 'Cocktail',
    description: 'Name it or identify with a photo',
    icon: '🍹',
  },
]

export const beerVolumeOptions = [
  { label: '330 ml (small can/bottle)', value: 330 },
  { label: '500 ml (large glass/pint)', value: 500 },
]

export interface DistilledOption {
  id: DistilledSubType
  label: string
  description: string
}

export const distilledOptions: DistilledOption[] = [
  { id: 'whiskey', label: 'Whiskey', description: 'Default 40 ml · ~40% ABV' },
  { id: 'vodka', label: 'Vodka', description: 'Default 50 ml · ~40% ABV' },
  { id: 'rum', label: 'Rum', description: 'Default 45 ml · ~37% ABV' },
  { id: 'gin', label: 'Gin', description: 'Default 50 ml · ~40% ABV' },
  { id: 'tequila', label: 'Tequila', description: 'Default 45 ml · ~38% ABV' },
  { id: 'other', label: 'Other', description: 'Enter your own amount' },
]

export const distilledDefaultVolumes: Record<DistilledSubType, number> = {
  whiskey: 40,
  vodka: 50,
  rum: 45,
  gin: 50,
  tequila: 45,
  other: 45,
}

export const cocktailVolumePresets: Record<string, number> = {
  margarita: 150,
  'old fashioned': 90,
  mojito: 200,
}

export const defaultCocktailVolumeMl = 150

export const drinkTypes: DrinkType[] = [
  {
    id: 'beer-classic',
    baseCategory: 'beer',
    name: 'Beer (lager/ale)',
    defaultAbv: 4.5,
    defaultVolumeMl: 330,
  },
  {
    id: 'soju-classic',
    baseCategory: 'soju',
    name: 'Soju shot',
    defaultAbv: 16,
    defaultVolumeMl: 60,
  },
  {
    id: 'wine-red',
    baseCategory: 'wine',
    name: 'Wine glass',
    defaultAbv: 12,
    defaultVolumeMl: 150,
  },
  {
    id: 'distilled-whiskey',
    baseCategory: 'distilled',
    name: 'Whiskey shot',
    defaultAbv: 40,
    defaultVolumeMl: 40,
    distilledSubType: 'whiskey',
  },
  {
    id: 'distilled-vodka',
    baseCategory: 'distilled',
    name: 'Vodka shot',
    defaultAbv: 40,
    defaultVolumeMl: 50,
    distilledSubType: 'vodka',
  },
  {
    id: 'distilled-rum',
    baseCategory: 'distilled',
    name: 'Rum shot',
    defaultAbv: 37,
    defaultVolumeMl: 45,
    distilledSubType: 'rum',
  },
  {
    id: 'distilled-gin',
    baseCategory: 'distilled',
    name: 'Gin shot',
    defaultAbv: 40,
    defaultVolumeMl: 50,
    distilledSubType: 'gin',
  },
  {
    id: 'distilled-tequila',
    baseCategory: 'distilled',
    name: 'Tequila shot',
    defaultAbv: 38,
    defaultVolumeMl: 45,
    distilledSubType: 'tequila',
  },
  {
    id: 'cocktail-generic',
    baseCategory: 'cocktail',
    name: 'Cocktail',
    defaultAbv: 12,
    defaultVolumeMl: 150,
  },
]

export const findDrinkType = (id: string) => drinkTypes.find((drink) => drink.id === id)
