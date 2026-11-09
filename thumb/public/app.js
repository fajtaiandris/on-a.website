import { createPalette } from './palette.js'
import { createPixelGrid } from './pixel-grid.js'
import { createPreviews } from './previews.js'

const editor = document.querySelector('#editor')
const resetButton = document.querySelector('#reset-button')
const titleInput = document.querySelector('#title')
const pixelGrid = document.querySelector('#pixel-art')
const brushes = document.querySelector('.brushes')
const paletteElement = document.querySelector('#palette')
const previewStatus = document.querySelector('#preview-status')
const previewsElement = document.querySelector('.previews')
const initialTitle = titleInput.defaultValue

editor.addEventListener('submit', (event) => event.preventDefault())

try {
  const response = await fetch('/og/defaults', { cache: 'no-store' })
  if (!response.ok) throw new Error('Could not load defaults')
  const defaults = await response.json()

  let previews
  const onChange = () => previews.schedule()
  const palette = createPalette(paletteElement, editor, defaults.colors, onChange)
  const art = createPixelGrid(pixelGrid, brushes, defaults, onChange)
  previews = createPreviews(titleInput, previewsElement, previewStatus, palette.readColors, art.readArt)

  titleInput.addEventListener('input', previews.schedule)
  resetButton.addEventListener('click', () => {
    titleInput.value = initialTitle
    art.reset()
    palette.reset(defaults.colors)
    previews.schedule()
  })

  editor.hidden = false
  resetButton.disabled = false
  previews.render()
} catch {
  previewStatus.textContent = 'The artwork could not be loaded. Refresh the page to try again.'
}
