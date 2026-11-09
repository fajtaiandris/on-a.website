import { Hono } from 'hono'

const app = new Hono()

const cellSize = 50
const colors = { accent: '#292929', background: '#c8d9c7' } as const

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
        ? [`<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="${colors.accent}"/>`]
        : [],
    ),
  )
  .join('')

app.get('/og', (c) => {
  const title = c.req.query('title')?.trim()
  if (!title) return c.text('title is required', 400)

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <pattern id="grid" width="${cellSize}" height="${cellSize}" patternUnits="userSpaceOnUse">
    <rect width="${cellSize}" height="${cellSize}" fill="${colors.background}" />
    <path d="M ${cellSize} 0 H 0 V ${cellSize}" fill="none" stroke="${colors.accent}" stroke-width="3" />
    </pattern>
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="1" result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G" />
    </filter>
    </defs>
  <g filter="url(#noise)">
  <rect width="1200" height="630" fill="url(#grid)" />
  ${pixelArtSvg}
  <rect width="1200" height="180" y="450" x="0" fill="${colors.accent}"/>
  <rect width="1200" height="630" fill="none" stroke="${colors.accent}" stroke-width="15" />
  </g>
  <text x="30" y="510" dominant-baseline="middle" text-anchor="start" fill="${colors.background}" font-family="Arial, sans-serif" font-size="84" font-weight="700" letter-spacing="-7px">${escapeXml(title)}</text>
</svg>`

  return c.body(svg, 200, { 'Content-Type': 'image/svg+xml; charset=utf-8' })
})

export default app
