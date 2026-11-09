import test from 'node:test'
import assert from 'node:assert/strict'
import { createPalette } from '../public/palette.js'
import { createPixelGrid } from '../public/pixel-grid.js'
import { createPreviews } from '../public/previews.js'
import { app } from './api-app.mjs'

class Element {
  constructor(className = '') {
    this.className = className
    this.children = []
    this.dataset = {}
    this.attributes = new Map()
    this.listeners = new Map()
    this.classes = new Set()
    this.classList = {
      add: (name) => this.classes.add(name),
      remove: (name) => this.classes.delete(name),
      contains: (name) => this.classes.has(name),
    }
    this.style = { setProperty: (name, value) => { this.style[name] = value } }
  }

  get childElementCount() { return this.children.length }
  append(...children) {
    for (const child of children) {
      if (child.isFragment) this.children.push(...child.children)
      else this.children.push(child)
    }
  }
  addEventListener(type, listener) { this.listeners.set(type, listener) }
  fire(type, event = {}) { this.listeners.get(type)?.({ target: this, ...event }) }
  setAttribute(name, value) { this.attributes.set(name, value) }
  removeAttribute(name) {
    this.attributes.delete(name)
    if (name === 'href' || name === 'src') this[name] = undefined
  }
  getAttribute(name) { return this.attributes.get(name) }
  closest(selector) {
    if (selector === '.pixel-cell' && this.className === 'pixel-cell') return this
    if (selector === '[data-brush]' && this.dataset.brush) return this
    return null
  }
  contains(child) { return this.children.includes(child) }
  querySelectorAll(selector) { return selector === '[data-brush]' ? this.children : [] }
  setPointerCapture() {}
}

globalThis.document = {
  createElement: () => new Element(),
  createDocumentFragment: () => Object.assign(new Element(), { isFragment: true }),
  createTextNode: (textContent) => ({ textContent }),
  elementFromPoint: () => null,
}

const defaultColors = {
  accent: '#292929', background: '#c8d9c7',
  '1': '#292929', '2': '#527a64', '3': '#8fa86b', '4': '#e6b86a', '5': '#d98373',
}

test('palette links color 1 to accent until color 1 is edited', () => {
  const paletteElement = new Element()
  const editor = new Element()
  let changes = 0
  const palette = createPalette(paletteElement, editor, defaultColors, () => changes++)
  const controls = (key) => {
    const index = ['accent', 'background', '1', '2', '3', '4', '5'].indexOf(key)
    return paletteElement.children[index].children[1].children
  }
  assert.equal(controls('accent')[0].getAttribute('aria-describedby'), 'palette-link-help')
  assert.equal(controls('1')[1].getAttribute('aria-describedby'), 'palette-link-help')

  controls('accent')[0].value = '#abcdef'
  controls('accent')[0].fire('input')
  assert.equal(controls('1')[1].value, '#abcdef')

  controls('1')[1].value = 'invalid'
  controls('1')[1].fire('input')
  controls('accent')[0].value = '#334455'
  controls('accent')[0].fire('input')
  assert.equal(controls('1')[1].value, '#334455')

  controls('1')[1].value = '123'
  controls('1')[1].fire('input')
  assert.match(palette.readColors().value, /1:112233/)
  controls('accent')[0].value = '#fedcba'
  controls('accent')[0].fire('input')
  assert.equal(controls('1')[1].value, '123')

  controls('2')[1].value = 'not-a-color'
  const invalidColor = palette.readColors()
  assert.match(invalidColor.error, /pixel color 2/)
  assert.equal(invalidColor.field, controls('2')[1])
  palette.reset(defaultColors)
  assert.equal(controls('1')[1].value, defaultColors['1'])
  assert.equal(editor.style['--art-accent'], defaultColors.accent)
  assert.equal(changes, 5)
})

test('mouse strokes fill skipped cells while touch scrolling remains available', () => {
  const grid = new Element()
  const brushes = new Element()
  for (const color of ['1', '2', '3', '4', '5', '.']) {
    const button = new Element()
    button.dataset.brush = color
    brushes.append(button)
  }
  const defaults = { grid: { columns: 24, rows: 9 }, pixelArt: Array(9).fill('.'.repeat(24)) }
  let changes = 0
  const art = createPixelGrid(grid, brushes, defaults, () => changes++)
  brushes.fire('click', { target: brushes.children[1] })

  const first = grid.children[0]
  const sixth = grid.children[5]
  document.elementFromPoint = () => sixth
  grid.fire('pointerdown', { target: first, pointerId: 1, pointerType: 'mouse', button: 0 })
  grid.fire('pointermove', { pointerId: 1, clientX: 100, clientY: 10 })
  grid.fire('pointerup', { pointerId: 1 })
  assert.equal(art.readArt().split('/')[0].slice(0, 7), '222222.')
  assert.equal(changes, 6)

  const touchCell = grid.children[7]
  grid.fire('pointerdown', { target: touchCell, pointerId: 2, pointerType: 'touch', button: 0 })
  assert.equal(art.readArt().split('/')[0][7], '.')
  grid.fire('click', { target: touchCell })
  assert.equal(art.readArt().split('/')[0][7], '2')
  art.reset()
  assert.equal(art.readArt(), defaults.pixelArt.join('/'))
})

test('previews disable failed links and explain server title errors', async () => {
  const title = new Element()
  title.value = 'A title'
  const status = { textContent: '' }
  const cards = ['1200x630', '1200x1200', '1280x720'].map((size) => {
    const card = new Element()
    card.dataset.size = size
    const image = new Element()
    const link = new Element()
    card.image = image
    card.link = link
    card.querySelector = (selector) => selector === '[data-preview]' ? image : link
    return card
  })
  const previews = new Element()
  previews.querySelectorAll = () => cards
  globalThis.window = { location: { href: 'https://thumb.on-a.website/' } }
  let colorResult = { value: 'accent:292929,background:c8d9c7' }
  const pixelArt = Array(9).fill('.'.repeat(24)).join('/')
  const controller = createPreviews(title, previews, status, () => colorResult, () => pixelArt)

  controller.render()
  for (const card of cards) {
    const url = new URL(card.image.src)
    assert.equal(url.pathname, '/og')
    assert.equal(url.searchParams.get('title'), 'A title')
    assert.equal(url.searchParams.get('size'), card.dataset.size)
    assert.equal(url.searchParams.get('pixelArt'), pixelArt)
    assert.equal((await app.request(url.href)).status, 200)
    assert.equal(card.link.href, undefined)
    card.image.onload()
    assert.equal(card.link.href, card.image.src)
  }

  title.value = 'W'.repeat(13_000)
  controller.render()
  assert.equal(cards[0].link.href, undefined)
  assert.equal(cards[0].classList.contains('is-stale'), true)
  assert.match(cards[0].image.alt, /^Previous/)
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => ({ status: 400, text: async () => 'title is too long to fit in selected size' })
  try {
    await cards[0].image.onerror()
  } finally {
    globalThis.fetch = originalFetch
  }
  assert.equal(cards[0].link.href, undefined)
  assert.equal(cards[0].classList.contains('is-stale'), true)
  assert.match(status.textContent, /Shorten the title/)
  assert.equal(title.getAttribute('aria-invalid'), 'true')
  assert.equal(title.getAttribute('aria-describedby'), 'preview-status')

  const hexField = new Element()
  hexField.setAttribute('aria-describedby', 'palette-link-help')
  colorResult = { error: 'Enter a valid color.', field: hexField }
  controller.render()
  assert.equal(status.textContent, colorResult.error)
  assert.equal(hexField.getAttribute('aria-describedby'), 'palette-link-help preview-status')
  assert.equal(cards[0].link.href, undefined)
  assert.equal(previews.classList.contains('is-stale'), true)
  assert.match(cards[0].image.alt, /^Previous/)
  title.value = ''
  controller.render()
  assert.equal(status.textContent, 'Add a title to preview.')
  assert.equal(title.getAttribute('aria-invalid'), 'true')
  assert.equal(title.getAttribute('aria-describedby'), 'preview-status')
  assert.equal(hexField.getAttribute('aria-describedby'), 'palette-link-help')

  title.value = 'Fixed title'
  colorResult = { value: 'accent:292929,background:c8d9c7' }
  controller.render()
  assert.equal(title.getAttribute('aria-invalid'), 'false')
  assert.equal(title.getAttribute('aria-describedby'), undefined)
  assert.equal(status.textContent, '')
})
