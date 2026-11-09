export const previewUrl = ({ title, size, colors, pixelArt }) => {
  const url = new URL('/local/preview', window.location.href)
  const colorQuery = Object.entries(colors).map(([key, color]) => `${key}:${color.slice(1)}`).join(',')
  url.search = new URLSearchParams({ title, size, colors: colorQuery, pixelArt }).toString()
  return url.href
}

export const createPreviews = (titleInput, previews, previewStatus, readColors, readArt) => {
  const cards = [...previews.querySelectorAll('.preview-card')].map((element) => ({
    element,
    size: element.dataset.size,
    image: element.querySelector('[data-preview]'),
    openLink: element.querySelector('[data-open]'),
    previous: null,
  }))
  let renderTimer
  let renderVersion = 0
  let describedField = null

  const updateDescription = (field, includeStatus) => {
    const ids = (field.getAttribute('aria-describedby') ?? '').split(/\s+/).filter((id) => id && id !== 'preview-status')
    if (includeStatus) ids.push('preview-status')
    if (ids.length) field.setAttribute('aria-describedby', ids.join(' '))
    else field.removeAttribute('aria-describedby')
  }

  const describeField = (field) => {
    if (describedField) updateDescription(describedField, false)
    describedField = field
    if (field) updateDescription(field, true)
  }

  const markStale = (card) => {
    card.element.classList.add('is-stale')
    card.openLink.removeAttribute('href')
    const dimensions = card.size.replace('x', ' by ')
    card.image.alt = card.previous
      ? `Previous ${dimensions} OG image preview: ${card.previous.title}`
      : `${dimensions} OG image preview unavailable`
  }

  const restorePrevious = (card) => {
    card.image.onload = null
    card.image.onerror = null
    if (card.previous) {
      if (card.image.src !== card.previous.url) card.image.src = card.previous.url
    } else {
      card.image.removeAttribute('src')
    }
  }

  const showStalePreviews = () => {
    previews.classList.add('is-stale')
    for (const card of cards) {
      restorePrevious(card)
      markStale(card)
    }
  }

  const render = () => {
    const version = ++renderVersion
    const title = titleInput.value.trim()
    const pixelArt = readArt()
    const paletteResult = readColors()
    titleInput.setAttribute('aria-invalid', title ? 'false' : 'true')
    describeField(!title ? titleInput : paletteResult.field ?? null)
    if (!title || paletteResult.error) {
      showStalePreviews()
      previewStatus.textContent = !title ? 'Add a title to preview.' : paletteResult.error
      return
    }

    previews.classList.remove('is-stale')
    previewStatus.textContent = ''
    let hasValidationError = false
    for (const card of cards) {
      const url = previewUrl({ title, size: card.size, colors: paletteResult.colors, pixelArt })
      markStale(card)

      card.image.onload = () => {
        if (version !== renderVersion) return
        card.previous = { title, url }
        card.element.classList.remove('is-stale')
        card.image.alt = `${card.size.replace('x', ' by ')} OG image preview: ${title}`
        card.openLink.href = url
      }
      card.image.onerror = async () => {
        if (version !== renderVersion) return
        restorePrevious(card)
        markStale(card)
        if (!hasValidationError) previewStatus.textContent = `Could not load the ${card.size} preview.`

        try {
          const response = await fetch(url, { cache: 'no-store' })
          if (response.status !== 400) return
          const message = (await response.text()).trim()
          if (version !== renderVersion || !message) return
          hasValidationError = true
          const sentence = message.endsWith('.') ? message : `${message}.`
          const guidance = message.includes('too long to fit') ? ' Shorten the title.' : ''
          previewStatus.textContent = `${card.size}: ${sentence}${guidance}`
          if (/^title\b/i.test(message)) {
            titleInput.setAttribute('aria-invalid', 'true')
            describeField(titleInput)
          }
        } catch {
          // The generic load error remains visible if the response cannot be read.
        }
      }
      card.image.src = url
    }
  }

  return {
    render,
    schedule() {
      clearTimeout(renderTimer)
      renderVersion += 1
      previewStatus.textContent = ''
      describeField(null)
      showStalePreviews()
      renderTimer = setTimeout(render, 150)
    },
  }
}
