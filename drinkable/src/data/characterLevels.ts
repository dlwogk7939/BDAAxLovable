import type { CharacterLevelConfig } from '../types'

export const characterImages: Record<number, string> = {
  0: '/src/assets/characters/char_0.png',
  1: '/src/assets/characters/char_1.png',
  2: '/src/assets/characters/char_2.png',
  3: '/src/assets/characters/char_3.png',
  4: '/src/assets/characters/char_4.png',
  5: '/src/assets/characters/char_5.png',
}

export const characterLevels: CharacterLevelConfig[] = [
  {
    level: 0,
    minPercent: 0,
    maxPercent: 5,
    label: 'Clear-headed',
    message: "You haven't had a drink yet.",
  },
  {
    level: 1,
    minPercent: 5,
    maxPercent: 15,
    label: 'Light buzz',
    message: 'You feel relaxed and chatty.',
  },
  {
    level: 2,
    minPercent: 15,
    maxPercent: 25,
    label: 'Happy vibes',
    message: 'Great mood for conversations.',
  },
  {
    level: 3,
    minPercent: 25,
    maxPercent: 35,
    label: 'Tipsy',
    message: "You're starting to feel it.",
  },
  {
    level: 4,
    minPercent: 35,
    maxPercent: 45,
    label: 'Pretty buzzed',
    message: 'Grab some water and slow down a bit.',
  },
  {
    level: 5,
    minPercent: 45,
    maxPercent: 55,
    label: 'Heavily buzzed',
    message: 'Time to pace yourself.',
  },
  {
    level: 6,
    minPercent: 55,
    maxPercent: 65,
    label: 'High risk',
    message: 'Adding more drinks is not a good idea.',
  },
  {
    level: 7,
    minPercent: 65,
    maxPercent: 75,
    label: 'Danger zone',
    message: 'Switch to water or snacks now.',
  },
  {
    level: 8,
    minPercent: 75,
    maxPercent: 90,
    label: 'Very risky',
    message: 'You might need support from a friend.',
  },
  {
    level: 9,
    minPercent: 90,
    maxPercent: 100,
    label: 'Critical',
    message: 'Stop drinking immediately.',
  },
]
