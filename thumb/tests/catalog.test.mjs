import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import sharp from 'sharp'
import { buildCatalog } from '../scripts/build.mjs'
import { createEditorServer } from '../scripts/editor.mjs'
import { generator, readCatalog } from '../scripts/core.mjs'
import { replaceOutput } from '../scripts/output.mjs'

const sample = {
  slug: 'fixture',
  title: 'Fixture',
  colors: { ...generator.defaultColors },
  pixelArt: [...generator.pixelArt],
}

test('catalog rejects unsafe slugs, duplicate names, invalid art, and titles that cannot fit', () => {
  assert.equal(generator.parseCatalog([sample])[0].slug, 'fixture')
  assert.throws(() => generator.parseCatalog([sample, sample]), /Duplicate slug/)
  assert.throws(() => generator.parseThumbnail({ ...sample, slug: '../escape' }), /Slug/)
  assert.throws(() => generator.parseThumbnail({ ...sample, colors: { ...sample.colors, accent: 'red' } }), /accent/)
  assert.throws(() => generator.parseThumbnail({ ...sample, pixelArt: ['x', ...sample.pixelArt.slice(1)] }), /Pixel art/)
  assert.throws(() => generator.parseThumbnail({ ...sample, title: 'W'.repeat(13_000) }), /too long/)
  assert.throws(() => generator.parseThumbnail({ ...sample, title: 'A'.repeat(5_000) }), /too long/)
  assert.equal(generator.parseColors('accent:ABC').accent, '#ABC')
  assert.equal(generator.parseThumbnail({ ...sample, colors: { ...sample.colors, accent: '#ABC' } }).colors.accent, '#abc')
})

test('build replaces stale files and includes only the three static JPEG sizes', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'thumb-build-test-'))
  const catalogFile = join(temporary, 'catalog.json')
  const destination = join(temporary, 'dist')
  const stale = join(destination, 'og', 'stale.svg')
  const sizes = [['1200x630', 1200, 630], ['1200x1200', 1200, 1200], ['1280x720', 1280, 720]]
  const outputPath = (size) => join(destination, 'og', sample.slug, `${size}.jpg`)
  const hashes = async () => new Map(await Promise.all(sizes.map(async ([size]) => [
    size,
    createHash('sha256').update(await readFile(outputPath(size))).digest('hex'),
  ])))
  const writeFixture = (item) => writeFile(catalogFile, JSON.stringify([item]))

  try {
    await writeFixture(sample)
    await mkdir(join(destination, 'og'), { recursive: true })
    await writeFile(stale, 'stale')
    await buildCatalog({ catalogFile, destination })
    assert.deepEqual((await readdir(destination)).sort(), ['og'])
    assert.deepEqual((await readdir(join(destination, 'og'))).sort(), [sample.slug])
    assert.deepEqual((await readdir(join(destination, 'og', sample.slug))).sort(), sizes.map(([size]) => `${size}.jpg`).sort())
    await assert.rejects(readFile(stale), { code: 'ENOENT' })
    for (const [size, width, height] of sizes) {
      const bytes = await readFile(outputPath(size))
      assert.equal(bytes.subarray(0, 3).toString('hex'), 'ffd8ff')
      const metadata = await sharp(bytes).metadata()
      assert.equal(metadata.format, 'jpeg')
      assert.deepEqual([metadata.width, metadata.height], [width, height])
    }
    let previous = await hashes()
    await buildCatalog({ catalogFile, destination })
    assert.deepEqual(await hashes(), previous, 'unchanged builds are byte-identical')

    const changedTitle = { ...sample, title: 'Different fixture title' }
    const changedPalette = { ...changedTitle, colors: { ...sample.colors, background: '#ffffff' } }
    const changedArt = [...sample.pixelArt]
    changedArt[0] = `${changedArt[0].slice(0, 12)}2${changedArt[0].slice(13)}`
    for (const item of [changedTitle, changedPalette, { ...changedPalette, pixelArt: changedArt }]) {
      await writeFixture(item)
      await buildCatalog({ catalogFile, destination })
      const next = await hashes()
      for (const [size, hash] of next) assert.notEqual(hash, previous.get(size), size)
      previous = next
    }
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
})

test('JPEG output keeps a straight frame around a displaced grid', async () => {
  const svg = generator.renderOgSvg({
    title: 'Fixture',
    size: '1200x630',
    colors: generator.defaultColors,
    art: Array(generator.gridRows).fill('.'.repeat(generator.gridColumns)),
  })
  const jpeg = await sharp(Buffer.from(svg))
    .flatten({ background: generator.defaultColors.background })
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
    .toBuffer()
  const { data, info } = await sharp(jpeg).raw().toBuffer({ resolveWithObject: true })
  const red = (x, y) => data[(y * info.width + x) * info.channels]
  for (const y of [25, 75, 125, 175, 225, 325]) {
    assert.ok(red(5, y) < 90, `frame at y=${y}`)
    assert.ok(red(8, y) > 150, `inside frame at y=${y}`)
  }
  const gridLinePositions = []
  for (let y = 15; y <= 195; y += 10) {
    let darkestX = 45
    for (let x = 46; x <= 55; x++) {
      if (red(x, y) < red(darkestX, y)) darkestX = x
    }
    gridLinePositions.push(darkestX)
  }
  assert.ok(Math.max(...gridLinePositions) - Math.min(...gridLinePositions) >= 2)
})

test('square JPEG crops outer columns and keeps colored art above the title', async () => {
  const firstRow = Array(generator.gridColumns).fill('.')
  firstRow[0] = '1'
  firstRow[4] = '2'
  firstRow[19] = '3'
  firstRow[23] = '4'
  const colors = {
    ...generator.defaultColors,
    '1': '#ff0000',
    '2': '#00ff00',
    '3': '#ffff00',
    '4': '#0000ff',
  }
  const svg = generator.renderOgSvg({
    title: 'Fixture',
    size: '1200x1200',
    colors,
    art: [firstRow.join(''), ...Array(generator.gridRows - 1).fill('.'.repeat(generator.gridColumns))],
  })
  const jpeg = await sharp(Buffer.from(svg))
    .flatten({ background: colors.background })
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
    .toBuffer()
  const { data, info } = await sharp(jpeg).raw().toBuffer({ resolveWithObject: true })
  const pixel = (x, y) => [...data.subarray((y * info.width + x) * info.channels, (y * info.width + x) * info.channels + 3)]
  const [leftRed, leftGreen, leftBlue] = pixel(40, 30)
  const [rightRed, rightGreen, rightBlue] = pixel(1160, 30)
  assert.ok(leftGreen > leftRed + 100 && leftGreen > leftBlue + 100, 'column 4 is visible')
  assert.ok(rightRed > 180 && rightGreen > 180 && rightBlue < 100, 'column 19 is visible')
  for (let x = 25; x < 1175; x += 5) {
    const [red, green, blue] = pixel(x, 30)
    assert.ok(!(red > 180 && green < 100 && blue < 100), 'column 0 is cropped')
    assert.ok(!(blue > 180 && red < 100 && green < 100), 'column 23 is cropped')
  }
  let titlePixels = 0
  for (let y = 710; y < 900; y += 4) {
    for (let x = 40; x < 400; x += 4) {
      const [red, green] = pixel(x, y)
      if (red > 150 && green > 150) titlePixels++
    }
  }
  assert.ok(titlePixels > 100, 'title is visible in the upper footer')
  for (let y = 1000; y < 1100; y += 10) {
    assert.ok(pixel(100, y)[0] < 90, 'lower footer remains clear')
  }
})

test('failed output replacement rolls back and the next build recovers an interrupted swap', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'thumb-output-test-'))
  const staging = join(temporary, 'staging')
  const destination = join(temporary, 'dist')
  try {
    await mkdir(staging)
    await mkdir(destination)
    await writeFile(join(staging, 'new.txt'), 'new')
    await writeFile(join(destination, 'old.txt'), 'old')
    await assert.rejects(
      replaceOutput(staging, destination, {
        move: (from, to) => from === staging ? Promise.reject(new Error('Simulated move failure')) : rename(from, to),
      }),
      /Simulated move failure/,
    )
    assert.equal(await readFile(join(destination, 'old.txt'), 'utf8'), 'old')
    assert.equal(await readFile(join(staging, 'new.txt'), 'utf8'), 'new')
    await replaceOutput(staging, destination)
    assert.equal(await readFile(join(destination, 'new.txt'), 'utf8'), 'new')
    await assert.rejects(readFile(join(destination, 'old.txt')), { code: 'ENOENT' })
    const backup = join(temporary, '.thumb-build-previous-dist')
    await rename(destination, backup)
    const invalidCatalog = join(temporary, 'invalid-catalog.json')
    await writeFile(invalidCatalog, '{')
    await assert.rejects(buildCatalog({ catalogFile: invalidCatalog, destination }), SyntaxError)
    assert.equal(await readFile(join(destination, 'new.txt'), 'utf8'), 'new')
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
})

test('local editor can preview and save catalog entries without a public API', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'thumb-editor-test-'))
  const file = join(temporary, 'catalog.json')
  const server = createEditorServer(file)
  await writeFile(file, JSON.stringify([sample]))
  const request = (path, { method = 'GET', body, chunks, headers = {} } = {}) => new Promise((resolve) => {
    const req = Readable.from(chunks ?? (body === undefined ? [] : [JSON.stringify(body)]))
    req.url = path
    req.method = method
    req.headers = { host: '127.0.0.1:8788', ...(method !== 'GET' ? { origin: 'http://127.0.0.1:8788' } : {}), ...headers }
    const result = { status: 0, body: '' }
    const res = {
      writeHead(status) { result.status = status },
      end(content) { result.body = String(content ?? ''); resolve(result) },
    }
    server.emit('request', req, res)
  })
  try {
    const catalog = JSON.parse((await request('/local/catalog')).body)
    assert.equal(catalog.items.length, 1)
    const preview = '/local/preview?' + new URLSearchParams({ title: 'Test & title', size: '1280x720' })
    assert.match((await request(preview)).body, /Test &amp; title/)
    assert.equal((await request('/og?title=robot')).status, 404)
    assert.equal((await request('/local/catalog', { headers: { 'sec-fetch-site': 'cross-site' } })).status, 403)

    const created = { ...sample, slug: 'new-one', title: 'New one' }
    const save = (originalSlug, item, originalItem = null) => request('/local/items', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: { originalSlug, originalItem, item },
    })
    assert.equal((await save(null, created)).status, 200)
    assert.equal((await save(null, created)).status, 422)
    const unicode = { ...sample, slug: 'unicode', title: 'Éclair 🌞' }
    const payload = Buffer.from(JSON.stringify({ originalSlug: null, originalItem: null, item: unicode }))
    const split = payload.indexOf(Buffer.from('É')) + 1
    assert.equal((await request('/local/items', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      chunks: [payload.subarray(0, split), payload.subarray(split)],
    })).status, 200)
    assert.equal((await readCatalog(file)).find((item) => item.slug === 'unicode')?.title, unicode.title)
    const updated = { ...created, title: 'Updated' }
    assert.equal((await save('new-one', updated, created)).status, 200)
    assert.equal((await save('new-one', { ...created, title: 'Stale edit' }, created)).status, 409)
    assert.equal((await readCatalog(file)).find((item) => item.slug === 'new-one')?.title, updated.title)
    const renamed = { ...updated, slug: 'renamed', title: 'Renamed' }
    assert.equal((await save('new-one', renamed, updated)).status, 200)
    assert.deepEqual((await readCatalog(file)).map((item) => item.slug), [sample.slug, 'renamed', 'unicode'])
    const removeItem = (originalItem) => request('/local/items/renamed', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: { originalItem },
    })
    assert.equal((await removeItem({ ...renamed, title: 'Old title' })).status, 409)
    assert.equal((await removeItem(renamed)).status, 200)
    assert.deepEqual((await readCatalog(file)).map((item) => item.slug), [sample.slug, 'unicode'])
    await writeFile(file, '{ invalid catalog')
    const previousError = console.error
    const errors = []
    console.error = (...args) => errors.push(args)
    try {
      const response = await request('/local/catalog')
      assert.equal(response.status, 500)
      assert.equal(response.body, 'Local editor failed. Check the terminal.')
      assert.equal(errors.length, 1)
    } finally {
      console.error = previousError
    }
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
})
