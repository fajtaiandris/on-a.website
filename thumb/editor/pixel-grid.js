const labelForCell = (row, column, color) =>
  `Row ${row + 1}, column ${column + 1}: ${color === '.' ? 'empty' : `color ${color}`}`

export const createPixelGrid = (grid, brushes, defaults, onChange) => {
  const brushButtons = [...brushes.querySelectorAll('[data-brush]')]
  let artRows
  let selectedBrush = '1'
  let activePointer = null
  let lastPaintedCell = null
  let focusedCell

  const showCellColor = (cell, row, column, color) => {
    cell.dataset.color = color
    cell.setAttribute('aria-label', labelForCell(row, column, color))
  }

  const setArt = (rows) => {
    artRows = rows.map((row) => [...row])
    if (!grid.childElementCount) {
      const cells = document.createDocumentFragment()
      artRows.forEach((row, y) => row.forEach((color, x) => {
        const cell = document.createElement('button')
        cell.type = 'button'
        cell.className = 'pixel-cell'
        cell.dataset.row = y
        cell.dataset.column = x
        cell.tabIndex = y === 0 && x === 0 ? 0 : -1
        showCellColor(cell, y, x, color)
        cells.append(cell)
      }))
      grid.append(cells)
      return
    }

    for (const cell of grid.children) {
      const row = Number(cell.dataset.row)
      const column = Number(cell.dataset.column)
      const color = artRows[row][column]
      showCellColor(cell, row, column, color)
    }
  }

  const paintCell = (cell) => {
    const row = Number(cell.dataset.row)
    const column = Number(cell.dataset.column)
    if (artRows[row][column] === selectedBrush) return
    artRows[row][column] = selectedBrush
    showCellColor(cell, row, column, selectedBrush)
    onChange()
  }

  const paintThrough = (from, to) => {
    if (!from) {
      paintCell(to)
      return
    }

    let row = Number(from.dataset.row)
    let column = Number(from.dataset.column)
    const endRow = Number(to.dataset.row)
    const endColumn = Number(to.dataset.column)
    const rowDistance = Math.abs(endRow - row)
    const columnDistance = Math.abs(endColumn - column)
    const rowStep = row < endRow ? 1 : -1
    const columnStep = column < endColumn ? 1 : -1
    let error = columnDistance - rowDistance

    while (true) {
      paintCell(grid.children[row * defaults.grid.columns + column])
      if (row === endRow && column === endColumn) break
      const doubledError = 2 * error
      if (doubledError > -rowDistance) {
        error -= rowDistance
        column += columnStep
      }
      if (doubledError < columnDistance) {
        error += columnDistance
        row += rowStep
      }
    }
  }

  const selectBrush = (color) => {
    selectedBrush = color
    for (const button of brushButtons) button.setAttribute('aria-pressed', button.dataset.brush === color ? 'true' : 'false')
  }

  brushes.addEventListener('click', (event) => {
    const button = event.target.closest('[data-brush]')
    if (button) selectBrush(button.dataset.brush)
  })

  grid.addEventListener('pointerdown', (event) => {
    const cell = event.target.closest('.pixel-cell')
    if (!cell || event.button !== 0 || event.pointerType === 'touch') return
    activePointer = event.pointerId
    lastPaintedCell = cell
    grid.setPointerCapture(event.pointerId)
    paintCell(cell)
  })
  grid.addEventListener('pointermove', (event) => {
    if (event.pointerId !== activePointer) return
    const cell = document.elementFromPoint(event.clientX, event.clientY)?.closest('.pixel-cell')
    if (cell && grid.contains(cell)) {
      paintThrough(lastPaintedCell, cell)
      lastPaintedCell = cell
    } else {
      lastPaintedCell = null
    }
  })
  const stopPainting = (event) => {
    if (event.pointerId === activePointer) {
      activePointer = null
      lastPaintedCell = null
    }
  }
  grid.addEventListener('pointerup', stopPainting)
  grid.addEventListener('pointercancel', stopPainting)
  grid.addEventListener('lostpointercapture', stopPainting)
  grid.addEventListener('click', (event) => {
    const cell = event.target.closest('.pixel-cell')
    if (cell) paintCell(cell)
  })

  grid.addEventListener('focusin', (event) => {
    const cell = event.target.closest('.pixel-cell')
    if (!cell) return
    if (focusedCell) focusedCell.tabIndex = -1
    cell.tabIndex = 0
    focusedCell = cell
  })
  grid.addEventListener('keydown', (event) => {
    const cell = event.target.closest('.pixel-cell')
    const moves = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }
    const move = moves[event.key]
    if (!cell || !move) return
    event.preventDefault()
    const row = Number(cell.dataset.row) + move[0]
    const column = Number(cell.dataset.column) + move[1]
    if (row < 0 || row >= defaults.grid.rows || column < 0 || column >= defaults.grid.columns) return
    grid.children[row * defaults.grid.columns + column].focus()
  })

  setArt(defaults.pixelArt)

  return {
    readArt: () => artRows.map((row) => row.join('')).join('/'),
    reset: (rows = defaults.pixelArt) => {
      setArt(rows)
      selectBrush('1')
    },
  }
}
