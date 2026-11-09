import { createPalette } from './palette.js'
import { createPixelGrid } from './pixel-grid.js'
import { createPreviews, previewUrl } from './previews.js'

const editor = document.querySelector('#editor')
const editorHeadingText = document.querySelector('#editor-heading-text')
const unsavedMark = document.querySelector('#unsaved-mark')
const resetButton = document.querySelector('#reset-button')
const newButton = document.querySelector('#new-button')
const saveButton = document.querySelector('#save-button')
const deleteButton = document.querySelector('#delete-button')
const titleInput = document.querySelector('#title')
const slugInput = document.querySelector('#slug')
const slugError = document.querySelector('#slug-error')
const pixelGrid = document.querySelector('#pixel-art')
const brushes = document.querySelector('.brushes')
const paletteElement = document.querySelector('#palette')
const previewStatus = document.querySelector('#preview-status')
const saveStatus = document.querySelector('#save-status')
const previewsElement = document.querySelector('.previews')
const catalogList = document.querySelector('#catalog-list')
const catalogCount = document.querySelector('#catalog-count')
const catalogFilter = document.querySelector('#catalog-filter')
const initialTitle = titleInput.defaultValue

const requestJson = async (url, options) => {
  const response = await fetch(url, options)
  if (!response.ok) throw new Error((await response.text()).trim() || 'Request failed.')
  return response.json()
}

try {
  const data = await requestJson('/local/catalog', { cache: 'no-store' })
  const defaults = data.defaults
  let items = data.items
  let originalSlug = null
  let savedState = null
  let savedValues = null
  let dirty = false
  let previews

  const currentValues = () => {
    const paletteResult = palette.readColors()
    return {
      title: titleInput.value,
      slug: slugInput.value,
      colors: paletteResult.colors,
      pixelArt: art.readArt(),
    }
  }

  const markChanged = () => {
    const current = currentValues()
    dirty = !current.colors ||
      current.title !== savedValues.title ||
      current.slug !== savedValues.slug ||
      current.pixelArt !== savedValues.pixelArt ||
      Object.keys(savedValues.colors).some((key) => current.colors[key] !== savedValues.colors[key])
    unsavedMark.hidden = !dirty
    saveStatus.textContent = ''
    previews.schedule()
  }
  const palette = createPalette(paletteElement, editor, defaults.colors, markChanged)
  const art = createPixelGrid(pixelGrid, brushes, defaults, markChanged)
  previews = createPreviews(titleInput, previewsElement, previewStatus, palette.readColors, art.readArt)

  const imageUrl = (item) => previewUrl({
    title: item.title,
    size: '1200x630',
    colors: item.colors,
    pixelArt: item.pixelArt.join('/'),
  })

  const setBusy = (busy) => {
    editor.inert = busy
    catalogList.inert = busy
    newButton.disabled = busy
    resetButton.disabled = busy
    saveButton.disabled = busy
    deleteButton.disabled = busy
  }

  const clearSlugError = () => {
    slugError.hidden = true
    slugError.textContent = ''
    slugInput.removeAttribute('aria-invalid')
    slugInput.removeAttribute('aria-describedby')
  }

  const renderCatalog = () => {
    const filter = catalogFilter.value.trim().toLowerCase()
    const visible = items.filter(({ title, slug }) => `${title} ${slug}`.toLowerCase().includes(filter))
    catalogCount.textContent = `${items.length} saved · ${visible.length} shown`
    catalogList.replaceChildren()
    if (!visible.length) {
      const empty = document.createElement('p')
      empty.className = 'catalog-empty'
      empty.textContent = items.length ? 'No thumbnails match your filter.' : 'No saved thumbnails yet. Create one below.'
      catalogList.append(empty)
      return
    }
    for (const item of visible) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'catalog-item'
      button.setAttribute('aria-label', `Edit ${item.title}, slug ${item.slug}`)
      button.setAttribute('aria-current', item.slug === originalSlug ? 'true' : 'false')
      const image = document.createElement('img')
      image.src = imageUrl(item)
      image.alt = ''
      image.loading = 'lazy'
      const details = document.createElement('span')
      details.className = 'catalog-item-details'
      const title = document.createElement('strong')
      title.textContent = item.title
      const slug = document.createElement('code')
      slug.textContent = item.slug
      details.append(title, slug)
      button.append(image, details)
      button.addEventListener('click', () => {
        if (dirty && !window.confirm('Discard unsaved changes?')) return
        loadItem(item)
        document.querySelector('.editor-card').scrollIntoView({ behavior: 'smooth', block: 'start' })
        titleInput.focus()
      })
      catalogList.append(button)
    }
  }

  const loadItem = (item, previewImmediately = false) => {
    originalSlug = item?.slug ?? null
    savedState = item ?? null
    titleInput.value = item?.title ?? initialTitle
    slugInput.value = item?.slug ?? ''
    clearSlugError()
    palette.reset(item?.colors ?? defaults.colors)
    art.reset(item?.pixelArt ?? defaults.pixelArt)
    savedValues = currentValues()
    editorHeadingText.textContent = item ? `Editing ${item.slug}` : 'New thumbnail'
    unsavedMark.hidden = true
    deleteButton.hidden = !item
    saveStatus.textContent = ''
    dirty = false
    renderCatalog()
    if (previewImmediately) previews.render()
    else previews.schedule()
  }

  titleInput.addEventListener('input', markChanged)
  slugInput.addEventListener('input', () => {
    clearSlugError()
    markChanged()
  })
  catalogFilter.addEventListener('input', renderCatalog)
  newButton.addEventListener('click', () => {
    if (dirty && !window.confirm('Discard unsaved changes?')) return
    loadItem(null)
    titleInput.focus()
  })
  resetButton.addEventListener('click', () => loadItem(savedState))

  editor.addEventListener('submit', async (event) => {
    event.preventDefault()
    const paletteResult = palette.readColors()
    if (paletteResult.error) {
      saveStatus.textContent = paletteResult.error
      paletteResult.field.focus()
      return
    }
    const slug = slugInput.value.trim()
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 64) {
      slugError.hidden = false
      slugError.textContent = 'Use lowercase letters, numbers, and single hyphens (up to 64 characters).'
      slugInput.setAttribute('aria-invalid', 'true')
      slugInput.setAttribute('aria-describedby', 'slug-error')
      slugInput.focus()
      return
    }
    const item = {
      slug,
      title: titleInput.value.trim(),
      colors: paletteResult.colors,
      pixelArt: art.readArt().split('/'),
    }
    setBusy(true)
    try {
      const result = await requestJson('/local/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalSlug, originalItem: savedState, item }),
      })
      items = result.items
      loadItem(result.item)
      saveStatus.textContent = 'Saved.'
    } catch (error) {
      saveStatus.textContent = error.message
    } finally {
      setBusy(false)
      saveButton.focus()
    }
  })

  window.addEventListener('beforeunload', (event) => {
    if (!dirty) return
    event.preventDefault()
    event.returnValue = ''
  })

  deleteButton.addEventListener('click', async () => {
    if (!originalSlug || !window.confirm(`Delete ${originalSlug} from the catalog?`)) return
    setBusy(true)
    let deleted = false
    try {
      const result = await requestJson(`/local/items/${originalSlug}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalItem: savedState }),
      })
      items = result.items
      loadItem(null)
      saveStatus.textContent = 'Deleted.'
      deleted = true
    } catch (error) {
      saveStatus.textContent = error.message
    } finally {
      setBusy(false)
      if (deleted) titleInput.focus()
      else deleteButton.focus()
    }
  })

  editor.hidden = false
  resetButton.disabled = false
  saveButton.disabled = false
  loadItem(null, true)
} catch (error) {
  previewStatus.textContent = `The local catalog could not be loaded: ${error.message}`
}
