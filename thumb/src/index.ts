import { Hono } from 'hono'
import { defaultColors, gridColumns, gridRows, pixelArt } from './design'
import { isSize, isXmlCompatibleText, parseColors, parsePixelArt } from './parameters'
import { renderOgSvg } from './svg'

const app = new Hono()

app.get('/og/defaults', (c) => c.json({
  colors: defaultColors,
  pixelArt,
  grid: { columns: gridColumns, rows: gridRows },
}))

app.get('/og', (c) => {
  const title = c.req.query('title')?.trim()
  if (!title) return c.text('title is required', 400)
  if (!isXmlCompatibleText(title)) return c.text('title contains characters that cannot appear in SVG', 400)

  const size = c.req.query('size') ?? '1200x630'
  if (!isSize(size)) return c.text('size must be 1200x630, 1200x1200, or 1280x720', 400)

  const colors = parseColors(c.req.query('colors'))
  if (!colors) return c.text('colors must be comma-separated key:hex pairs (accent, background, 1-5)', 400)

  const art = parsePixelArt(c.req.query('pixelArt'))
  if (!art) return c.text('pixelArt must be 9 rows of 24 cells using . and 1-5, separated by /', 400)

  const svg = renderOgSvg({ title, size, colors, art })
  if (!svg) return c.text('title is too long to fit in selected size', 400)
  return c.body(svg, 200, { 'Content-Type': 'image/svg+xml; charset=utf-8' })
})

export default app
