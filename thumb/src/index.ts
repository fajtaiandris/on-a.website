import { Hono } from 'hono'

const app = new Hono()

const escapeXml = (text: string) =>
  text.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&apos;',
    }
    return entities[character]
  })

// One character per grid cell, from the top left of the reference image.
const pixelArt = [
  '.......###..#####.......',
  '.....##.#.##.....##.....',
  '....#..###...#####.#....',
  '...#..#.#...##....###...',
  '..#.##...#.#....##.#.#..',
  '.#.##...###....##..#.##.',
  '.##.#..#..#..##...#..##.',
  '##...##....##....#..#.##',
  '#...##....#.##..#...#..#',
]

const pixelArtSvg = pixelArt
  .flatMap((row, y) =>
    [...row].flatMap((cell, x) =>
      cell === '#'
        ? [`<rect x="${x * 50}" y="${y * 50}" width="50" height="50" fill="#ff2c01"/>`]
        : [],
    ),
  )
  .join('')

app.get('/og', (c) => {
  const title = c.req.query('title')?.trim()
  if (!title) return c.text('title is required', 400)

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
    <rect width="50" height="50" fill="#c8d9c7" />
    <path d="M 50 0 H 0 V 50" fill="none" stroke="#ff2c01" stroke-width="3" />
    </pattern>
    </defs>
  <rect width="1200" height="630" fill="url(#grid)" />
  ${pixelArtSvg}
  <rect width="1200" height="180" y="450" x="0" fill="#ff2c01"/>
  <text x="30" y="510" dominant-baseline="middle" text-anchor="start" fill="#c8d9c7" font-family="Arial, sans-serif" font-size="84" font-weight="700" letter-spacing="-7px">${escapeXml(title)}</text>
  <rect width="1200" height="630" fill="none" stroke="#ff2c01" stroke-width="15" />
</svg>`

  return c.body(svg, 200, { 'Content-Type': 'image/svg+xml; charset=utf-8' })
})

export default app
