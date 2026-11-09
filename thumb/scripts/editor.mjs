import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import { generator, readCatalog, writeCatalog } from './core.mjs'

const editorDir = new URL('../editor/', import.meta.url)
const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/palette.js', ['palette.js', 'text/javascript; charset=utf-8']],
  ['/pixel-grid.js', ['pixel-grid.js', 'text/javascript; charset=utf-8']],
  ['/previews.js', ['previews.js', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
])

const json = (res, status, value) => respond(res, status, JSON.stringify(value), 'application/json; charset=utf-8')
const respond = (res, status, body, type = 'text/plain; charset=utf-8') => {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
  res.end(body)
}

class ClientError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const parseInputItem = (value) => {
  try {
    return generator.parseThumbnail(value)
  } catch (error) {
    throw new ClientError(422, error.message)
  }
}

const readJson = async (req) => {
  const chunks = []
  let byteLength = 0
  for await (const chunk of req) {
    const bytes = Buffer.from(chunk)
    byteLength += bytes.length
    if (byteLength > 100_000) throw new ClientError(413, 'Request is too large.')
    chunks.push(bytes)
  }
  try {
    return JSON.parse(Buffer.concat(chunks, byteLength).toString('utf8'))
  } catch {
    throw new ClientError(400, 'Invalid JSON.')
  }
}

let mutationQueue = Promise.resolve()
const mutate = (operation) => {
  const result = mutationQueue.then(operation)
  mutationQueue = result.catch(() => {})
  return result
}

export const createEditorServer = (catalogFile) => createServer(async (req, res) => {
  const host = req.headers.host ?? ''
  if (!/^127\.0\.0\.1:\d+$/.test(host) || req.headers['sec-fetch-site'] === 'cross-site') {
    respond(res, 403, 'Local editor only.')
    return
  }
  if (req.method !== 'GET' && req.headers.origin !== `http://${host}`) {
    respond(res, 403, 'Invalid origin.')
    return
  }

  try {
    const url = new URL(req.url, `http://${host}`)
    if (req.method === 'GET' && assets.has(url.pathname)) {
      const [name, type] = assets.get(url.pathname)
      respond(res, 200, await readFile(new URL(name, editorDir)), type)
    } else if (req.method === 'GET' && url.pathname === '/local/catalog') {
      json(res, 200, {
        items: await readCatalog(catalogFile),
        defaults: {
          colors: generator.defaultColors,
          pixelArt: generator.pixelArt,
          grid: { columns: generator.gridColumns, rows: generator.gridRows },
        },
      })
    } else if (req.method === 'GET' && url.pathname === '/local/preview') {
      const title = url.searchParams.get('title')?.trim()
      const size = url.searchParams.get('size') ?? '1200x630'
      const colors = generator.parseColors(url.searchParams.get('colors') ?? undefined)
      const art = generator.parsePixelArt(url.searchParams.get('pixelArt') ?? undefined)
      if (!title || !generator.isXmlCompatibleText(title)) return respond(res, 400, 'Enter a valid title.')
      if (!generator.isSize(size) || !colors || !art) return respond(res, 400, 'Invalid preview settings.')
      const svg = generator.renderOgSvg({ title, size, colors, art })
      if (!svg) return respond(res, 400, 'Title is too long to fit in selected size.')
      respond(res, 200, svg, 'image/svg+xml; charset=utf-8')
    } else if (req.method === 'POST' && url.pathname === '/local/items') {
      if (req.headers['content-type']?.split(';')[0] !== 'application/json') return respond(res, 415, 'Expected JSON.')
      const body = await readJson(req)
      const item = parseInputItem(body?.item)
      const originalSlug = body?.originalSlug
      if (originalSlug !== null && typeof originalSlug !== 'string') return respond(res, 400, 'Invalid original slug.')
      if (originalSlug === null && body.originalItem !== null) return respond(res, 400, 'Invalid original item.')
      const originalItem = originalSlug === null ? null : parseInputItem(body.originalItem)
      if (originalSlug !== null && originalItem.slug !== originalSlug) return respond(res, 400, 'Original item does not match slug.')
      const items = await mutate(async () => {
        const entries = await readCatalog(catalogFile)
        const index = originalSlug === null ? -1 : entries.findIndex((entry) => entry.slug === originalSlug)
        if (originalSlug !== null && index < 0) throw new ClientError(422, 'This thumbnail no longer exists. Reload the catalog.')
        if (index >= 0 && !isDeepStrictEqual(entries[index], originalItem)) throw new ClientError(409, 'This thumbnail changed since you loaded it. Reload the catalog.')
        if (entries.some((entry, i) => entry.slug === item.slug && i !== index)) throw new ClientError(422, 'That slug is already in use.')
        if (index < 0) entries.push(item)
        else entries[index] = item
        return writeCatalog(entries, catalogFile)
      })
      json(res, 200, { item, items })
    } else if (req.method === 'DELETE' && url.pathname.startsWith('/local/items/')) {
      if (req.headers['content-type']?.split(';')[0] !== 'application/json') return respond(res, 415, 'Expected JSON.')
      const slug = url.pathname.slice('/local/items/'.length)
      const body = await readJson(req)
      const originalItem = parseInputItem(body?.originalItem)
      if (originalItem.slug !== slug) return respond(res, 400, 'Original item does not match slug.')
      const items = await mutate(async () => {
        const entries = await readCatalog(catalogFile)
        const index = entries.findIndex((entry) => entry.slug === slug)
        if (index < 0) throw new ClientError(422, 'This thumbnail no longer exists. Reload the catalog.')
        if (!isDeepStrictEqual(entries[index], originalItem)) throw new ClientError(409, 'This thumbnail changed since you loaded it. Reload the catalog.')
        entries.splice(index, 1)
        return writeCatalog(entries, catalogFile)
      })
      json(res, 200, { items })
    } else {
      respond(res, 404, 'Not found.')
    }
  } catch (error) {
    if (error instanceof ClientError) return respond(res, error.status, error.message)
    console.error('Local thumb editor request failed:', error)
    respond(res, 500, 'Local editor failed. Check the terminal.')
  }
})

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const port = Number(process.env.THUMB_EDITOR_PORT ?? 8788)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid THUMB_EDITOR_PORT')
  createEditorServer().listen(port, '127.0.0.1', () => {
    console.log(`Local thumb editor: http://127.0.0.1:${port}/`)
  })
}
