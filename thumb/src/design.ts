export const gridColumns = 24
export const gridRows = 9

export const sizes = {
  '1200x630': { width: 1200, height: 630, cellSize: 50 },
  '1200x1200': { width: 1200, height: 1200, cellSize: 75 },
  '1280x720': { width: 1280, height: 720, cellSize: 1280 / gridColumns },
} as const

export type Size = keyof typeof sizes

export const defaultColors = {
  accent: '#292929',
  background: '#c8d9c7',
  '1': '#292929',
  '2': '#527a64',
  '3': '#8fa86b',
  '4': '#e6b86a',
  '5': '#d98373',
} as const

export type ColorKey = keyof typeof defaultColors
export type Colors = Record<ColorKey, string>

// One character per grid cell: . is empty; 1-5 select a palette color.
export const pixelArt = [
  '.......111..11111.......',
  '.....11.1.11.....11.....',
  '....1..111...11111.1....',
  '...1..1.1...11....111...',
  '..1.11...1.1....11.1.1..',
  '.1.11...111....11..1.11.',
  '.11.1..1..1..11...1..11.',
  '11...11....11....1..1.11',
  '1...11....1.11..1...1..1',
]
