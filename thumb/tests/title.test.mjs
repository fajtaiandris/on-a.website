import test from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const entryPoint = fileURLToPath(new URL('../src/title.ts', import.meta.url))
const bundle = await build({ entryPoints: [entryPoint], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' })
const source = Buffer.from(bundle.outputFiles[0].text).toString('base64')
const { layoutTitle } = await import(`data:text/javascript;base64,${source}`)

test('title wrapping keeps combining marks and joined emoji together', () => {
  for (const title of ['AAAAe\u0301', 'AAAA👩‍👩‍👧‍👦']) {
    const layout = layoutTitle(title, 84, 350, 1000)
    assert.equal(layout.lines.join(''), title)
    assert.equal(layout.lines.some((line) => line.includes(title.slice(4))), true)
  }
})

test('keycap titles stay within the text area at every supported size', () => {
  const keycap = '1️⃣'
  const title = keycap.repeat(40)
  for (const [baseSize, maxWidth, maxHeight] of [
    [84, 1120, 144],
    [112, 1120, 489],
    [84, 1200, 204],
  ]) {
    const layout = layoutTitle(title, baseSize, maxWidth, maxHeight)
    assert.ok(layout)
    assert.equal(layout.lines.join(''), title)
    assert.ok(layout.lines.length * layout.lineHeight <= maxHeight)
    for (const line of layout.lines) {
      const count = line.split(keycap).length - 1
      assert.equal(line, keycap.repeat(count))
      const glyphWidth = (count * 1.1 - Math.max(0, count - 1) * 0.083) * layout.fontSize
      assert.ok(glyphWidth <= maxWidth)
    }
  }
})
