import { defaultColors, gridColumns, gridRows, sizes } from './design'
import type { Colors, Size } from './design'
import { isHexColor, isXmlCompatibleText, parsePixelArt } from './parameters'
import { renderOgSvg } from './svg'

export type Thumbnail = {
  slug: string
  title: string
  colors: Colors
  pixelArt: string[]
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const parseThumbnail = (value: unknown): Thumbnail => {
  if (!isObject(value)) throw new Error('Thumbnail must be an object.')
  if (Object.keys(value).length !== 4 || !['slug', 'title', 'colors', 'pixelArt'].every((key) => key in value)) {
    throw new Error('Thumbnail must have slug, title, colors, and pixelArt fields.')
  }
  const { slug, title, colors, pixelArt } = value
  if (typeof slug !== 'string' || slug.length > 64 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error('Slug must use lowercase letters, numbers, and single hyphens (up to 64 characters).')
  }
  if (typeof title !== 'string' || !title.trim() || !isXmlCompatibleText(title.trim())) {
    throw new Error('Enter a title containing valid SVG text.')
  }
  if (!isObject(colors) || Object.keys(colors).length !== Object.keys(defaultColors).length) {
    throw new Error('Colors must include accent, background, and pixel colors 1–5.')
  }
  const normalizedColors = {} as Colors
  for (const key of Object.keys(defaultColors) as (keyof Colors)[]) {
    const color = colors[key]
    if (!isHexColor(color)) {
      throw new Error(`Invalid ${key} color.`)
    }
    normalizedColors[key] = `#${color.replace(/^#/, '').toLowerCase()}`
  }
  if (!Array.isArray(pixelArt) || pixelArt.length !== gridRows ||
      !pixelArt.every((row) => typeof row === 'string' && row.length === gridColumns)) {
    throw new Error(`Pixel art must have ${gridRows} rows of ${gridColumns} cells.`)
  }
  const art = parsePixelArt(pixelArt.join('/'))
  if (!art) throw new Error('Pixel art may contain only . and 1–5.')

  const thumbnail = { slug, title: title.trim(), colors: normalizedColors, pixelArt: art }
  for (const size of Object.keys(sizes) as Size[]) {
    if (!renderOgSvg({ title: thumbnail.title, size, colors: thumbnail.colors, art })) {
      throw new Error(`Title is too long to fit ${size}.`)
    }
  }
  return thumbnail
}

export const parseCatalog = (value: unknown): Thumbnail[] => {
  if (!Array.isArray(value)) throw new Error('Catalog must be a JSON array.')
  const slugs = new Set<string>()
  return value.map((entry, index) => {
    let thumbnail: Thumbnail
    try { thumbnail = parseThumbnail(entry) }
    catch (error) { throw new Error(`Entry ${index + 1}: ${(error as Error).message}`) }
    if (slugs.has(thumbnail.slug)) throw new Error(`Duplicate slug: ${thumbnail.slug}.`)
    slugs.add(thumbnail.slug)
    return thumbnail
  })
}
