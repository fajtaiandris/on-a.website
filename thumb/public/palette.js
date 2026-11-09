const colorFields = [
  ['accent', 'Accent / frame'],
  ['background', 'Background'],
  ['1', 'Pixel color 1'],
  ['2', 'Pixel color 2'],
  ['3', 'Pixel color 3'],
  ['4', 'Pixel color 4'],
  ['5', 'Pixel color 5'],
]

const normalizeHex = (value) => {
  const hex = value.trim().replace(/^#/, '')
  if (/^[\da-f]{3}$/i.test(hex)) return `#${[...hex].map((digit) => digit + digit).join('').toLowerCase()}`
  if (/^[\da-f]{6}$/i.test(hex)) return `#${hex.toLowerCase()}`
  return null
}

export const createPalette = (palette, editor, initialColors, onChange) => {
  const controlsByKey = new Map()
  let colorOneLinked = true

  const setColor = (key, value) => {
    const normalized = normalizeHex(value)
    if (!normalized) return
    const controls = controlsByKey.get(key)
    controls.picker.value = normalized
    controls.hex.value = normalized
    controls.hex.removeAttribute('aria-invalid')
  }

  const updateGridPalette = () => {
    for (const [key] of colorFields) {
      const color = normalizeHex(controlsByKey.get(key).hex.value)
      if (color) editor.style.setProperty(`--art-${key}`, color)
    }
  }

  const onColorChange = (key, value) => {
    if (key === '1' && normalizeHex(value)) colorOneLinked = false
    if (key === 'accent' && colorOneLinked) setColor('1', value)
    updateGridPalette()
    onChange()
  }

  const createControl = (key, label, value) => {
    const row = document.createElement('div')
    row.className = 'color-row'

    const name = document.createElement('label')
    name.className = 'color-label'
    name.htmlFor = `color-${key}`
    if (/^[1-5]$/.test(key)) {
      const number = document.createElement('span')
      number.className = 'color-number'
      number.textContent = key
      name.append(number)
    }
    name.append(document.createTextNode(label))

    const inputs = document.createElement('div')
    inputs.className = 'color-controls'
    const picker = document.createElement('input')
    picker.className = 'color-picker'
    picker.id = `color-${key}`
    picker.type = 'color'
    picker.setAttribute('aria-label', `Choose ${label.toLowerCase()}`)
    if (key === 'accent' || key === '1') picker.setAttribute('aria-describedby', 'palette-link-help')
    const hex = document.createElement('input')
    hex.className = 'color-hex'
    hex.type = 'text'
    hex.maxLength = 7
    hex.spellcheck = false
    hex.autocomplete = 'off'
    hex.setAttribute('aria-label', `${label} hex value`)
    if (key === 'accent' || key === '1') hex.setAttribute('aria-describedby', 'palette-link-help')
    inputs.append(picker, hex)
    row.append(name, inputs)
    palette.append(row)
    controlsByKey.set(key, { picker, hex })
    setColor(key, value)

    picker.addEventListener('input', () => {
      hex.value = picker.value
      hex.removeAttribute('aria-invalid')
      onColorChange(key, picker.value)
    })
    hex.addEventListener('input', () => {
      const normalized = normalizeHex(hex.value)
      hex.setAttribute('aria-invalid', normalized ? 'false' : 'true')
      if (normalized) picker.value = normalized
      onColorChange(key, hex.value)
    })
    hex.addEventListener('blur', () => {
      const normalized = normalizeHex(hex.value)
      if (normalized) hex.value = normalized
    })
  }

  for (const [key, label] of colorFields) createControl(key, label, initialColors[key])
  updateGridPalette()

  return {
    readColors() {
      const pairs = []
      for (const [key, label] of colorFields) {
        const { hex } = controlsByKey.get(key)
        const color = normalizeHex(hex.value)
        hex.setAttribute('aria-invalid', color ? 'false' : 'true')
        if (!color) return { error: `Enter a 3- or 6-digit hex value for ${label.toLowerCase()}.`, field: hex }
        pairs.push(`${key}:${color.slice(1)}`)
      }
      return { value: pairs.join(',') }
    },
    reset(colors) {
      for (const [key] of colorFields) setColor(key, colors[key])
      colorOneLinked = true
      updateGridPalette()
    },
  }
}
