import { defaultColors, gridColumns, gridRows, pixelArt, sizes } from './design'
import type { ColorKey, Colors, Size } from './design'

const hasOwn = (object: object, key: string) => Object.prototype.hasOwnProperty.call(object, key)

// XML 1.0 excludes these controls, lone surrogates, and U+FFFE/U+FFFF.
export const isXmlCompatibleText = (value: string) =>
  !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ud800-\udfff\ufffe\uffff]/u.test(value)

export const isSize = (value: string): value is Size => hasOwn(sizes, value)

const isColorKey = (key: string): key is ColorKey => hasOwn(defaultColors, key)

export const parseColors = (value: string | undefined): Colors | null => {
  const overrides: Partial<Colors> = {}

  if (value !== undefined) {
    for (const entry of value.split(',')) {
      const [key, color, extra] = entry.split(':')
      if (!isColorKey(key) || !color || extra !== undefined || !/^#?(?:[\da-fA-F]{3}|[\da-fA-F]{6})$/.test(color) || overrides[key]) {
        return null
      }
      overrides[key] = `#${color.replace(/^#/, '')}`
    }
  }

  return {
    ...defaultColors,
    ...overrides,
    '1': overrides['1'] ?? overrides.accent ?? defaultColors['1'],
  }
}

export const parsePixelArt = (value: string | undefined): string[] | null => {
  const rows = value === undefined ? pixelArt : value.split('/')
  return rows.length === gridRows && rows.every((row) => row.length === gridColumns && /^[.1-5]+$/.test(row))
    ? rows
    : null
}
