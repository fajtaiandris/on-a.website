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

app.get('/og', (c) => {
  const title = c.req.query('title')?.trim()
  if (!title) return c.text('title is required', 400)

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="white"/>
  <text x="600" y="315" dominant-baseline="middle" text-anchor="middle" fill="black" font-family="Arial, sans-serif" font-size="64">${escapeXml(title)}</text>
</svg>`

  return c.body(svg, 200, { 'Content-Type': 'image/svg+xml; charset=utf-8' })
})

export default app
