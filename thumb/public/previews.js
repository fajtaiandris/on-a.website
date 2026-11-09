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
    const colors = readColors()
    titleInput.setAttribute('aria-invalid', title ? 'false' : 'true')
    describeField(!title ? titleInput : colors.field ?? null)
    if (!title || colors.error) {
      showStalePreviews()
      previewStatus.textContent = !title ? 'Add a title to preview.' : colors.error
      return
    }

    previews.classList.remove('is-stale')
    previewStatus.textContent = ''
    let hasValidationError = false
    for (const card of cards) {
      const url = new URL('/og', window.location.href)
      url.search = new URLSearchParams({ title, size: card.size, colors: colors.value, pixelArt }).toString()
      markStale(card)

      card.image.onload = () => {
        if (version !== renderVersion) return
        card.previous = { title, url: url.href }
        card.element.classList.remove('is-stale')
        card.image.alt = `${card.size.replace('x', ' by ')} OG image preview: ${title}`
        card.openLink.href = url.href
      }
      card.image.onerror = async () => {
        if (version !== renderVersion) return
        restorePrevious(card)
        markStale(card)
        if (!hasValidationError) previewStatus.textContent = `Could not load the ${card.size} preview.`

        try {
          const response = await fetch(url.href, { cache: 'no-store' })
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
      card.image.src = url.href
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
