import test from 'node:test'
import assert from 'node:assert/strict'
import { app } from './api-app.mjs'

const requestOg = (parameters) => app.request(`https://thumb.on-a.website/og?${new URLSearchParams(parameters)}`)

test('defaults and all three SVG sizes use the shared artwork', async () => {
  const defaultsResponse = await app.request('https://thumb.on-a.website/og/defaults')
  assert.equal(defaultsResponse.status, 200)
  const defaults = await defaultsResponse.json()
  assert.deepEqual(defaults.grid, { columns: 24, rows: 9 })
  assert.equal(defaults.pixelArt.length, 9)
  assert.equal(defaults.pixelArt.every((row) => row.length === 24), true)

  const defaultSizeResponse = await requestOg({ title: 'A title' })
  assert.equal(defaultSizeResponse.status, 200)
  assert.match(await defaultSizeResponse.text(), /<svg[^>]+width="1200" height="630" viewBox="0 0 1200 630"/)

  for (const [size, width, height] of [
    ['1200x630', 1200, 630],
    ['1200x1200', 1200, 1200],
    ['1280x720', 1280, 720],
  ]) {
    const response = await requestOg({ title: 'A title', size })
    assert.equal(response.status, 200, size)
    assert.match(response.headers.get('content-type'), /^image\/svg\+xml/)
    const svg = await response.text()
    assert.match(svg, new RegExp(`<svg[^>]+width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"`))
    assert.match(svg, new RegExp(`fill="${defaults.colors.background}"`))
    assert.match(svg, new RegExp(`stroke="${defaults.colors.accent}"`))
  }
})

test('accent fallback, explicit color 1, and repeated query parameters follow the contract', async () => {
  const art = ['1' + '.'.repeat(23), ...Array(8).fill('.'.repeat(24))].join('/')
  const accentOnly = await requestOg({ title: 'Color test', colors: 'accent:123456', pixelArt: art })
  assert.equal(accentOnly.status, 200)
  assert.match(await accentOnly.text(), /<rect x="0" y="0" width="50" height="50" fill="#123456"\/>/)

  const explicitOne = await requestOg({ title: 'Color test', colors: 'accent:123456,1:abcdef', pixelArt: art })
  assert.equal(explicitOne.status, 200)
  assert.match(await explicitOne.text(), /<rect x="0" y="0" width="50" height="50" fill="#abcdef"\/>/)

  const repeated = await app.request('https://thumb.on-a.website/og?title=first&title=second&size=1200x630&size=bad')
  assert.equal(repeated.status, 200)
  const svg = await repeated.text()
  assert.match(svg, />first<\/tspan>/)
  assert.doesNotMatch(svg, />second<\/tspan>/)
})

test('custom inputs and XML punctuation are rendered safely', async () => {
  const art = ['2' + '.'.repeat(23), ...Array(8).fill('.'.repeat(24))].join('/')
  const response = await requestOg({
    title: 'A & <B> "C" \'D\'',
    colors: 'accent:123456,background:fff,2:00aaff',
    pixelArt: art,
  })
  assert.equal(response.status, 200)
  const svg = await response.text()
  assert.match(svg, /A &amp; &lt;B&gt; &quot;C&quot; &apos;D&apos;/)
  assert.match(svg, /fill="#00aaff"/)
  assert.match(svg, /fill="#fff"/)
  assert.match(svg, /stroke="#123456"/)

  const unicodeResponse = await requestOg({ title: 'Hello 😀' })
  assert.equal(unicodeResponse.status, 200)
  assert.match(await unicodeResponse.text(), /Hello 😀/)
})

test('invalid parameters and titles that cannot fit return 400', async () => {
  const cases = [
    [{}, /title is required/],
    [{ title: '   ' }, /title is required/],
    [{ title: 'x', size: 'bad' }, /size must be/],
    [{ title: 'x', colors: 'accent:ggg' }, /colors must be/],
    [{ title: 'x', pixelArt: 'bad' }, /pixelArt must be/],
    [{ title: 'A\u0000B' }, /cannot appear in SVG/],
    [{ title: 'A\ufffeB' }, /cannot appear in SVG/],
    [{ title: 'W'.repeat(13_000) }, /too long to fit/],
  ]
  for (const [parameters, message] of cases) {
    const response = await requestOg(parameters)
    assert.equal(response.status, 400, JSON.stringify(Object.keys(parameters)))
    assert.match(await response.text(), message)
  }
})
