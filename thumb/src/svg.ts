import { gridColumns, gridRows, sizes } from './design'
import type { ColorKey, Colors, Size } from './design'
import { layoutTitle } from './title'

const xmlEntities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
}

const escapeXml = (text: string) => text.replace(/[&<>"']/g, (character) => xmlEntities[character])

type ImageOptions = {
  title: string
  size: Size
  colors: Colors
  art: string[]
}

const renderGridLines = (artX: number, cellSize: number, gridWidth: number, gridHeight: number) => [
  ...Array.from({ length: gridColumns }, (_, x) => `M ${artX + x * cellSize} 0 V ${gridHeight}`),
  ...Array.from({ length: gridRows }, (_, y) => `M ${artX} ${y * cellSize} H ${artX + gridWidth}`),
].join(' ')

const renderPixelArt = (art: string[], colors: Colors, artX: number, cellSize: number, gridBleed: number) =>
  art.flatMap((row, y) =>
    [...row].flatMap((cell, x) => {
      const color = colors[cell as ColorKey]
      return color && cell !== '.'
        ? [`<rect x="${artX + x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize + (y === gridRows - 1 ? gridBleed : 0)}" fill="${color}"/>`]
        : []
    }),
  ).join('')

const renderTitle = (title: string, size: Size, width: number, gridHeight: number, footerHeight: number) => {
  const titleX = 30
  const rightMargin = 50
  const footerVerticalMargin = 18
  const squareTitleTopGap = 48
  const baseFontSize = size === '1200x1200' ? 112 : 84
  const titleLayout = layoutTitle(title, baseFontSize, width - titleX - rightMargin, footerHeight - 2 * footerVerticalMargin)
  if (!titleLayout) return null
  const { lines, fontSize, lineHeight } = titleLayout
  const titleBlockHeight = lines.length * lineHeight
  let titleCenterY
  if (size === '1200x1200') {
    const topGap = Math.max(0, Math.min(squareTitleTopGap, footerHeight - titleBlockHeight - footerVerticalMargin))
    titleCenterY = gridHeight + topGap + titleBlockHeight / 2
  } else {
    titleCenterY = gridHeight + (lines.length === 1 ? footerHeight / 3 : footerHeight / 2)
  }
  const spans = lines.map((line, index) =>
    `<tspan x="${titleX}" y="${titleCenterY + (index - (lines.length - 1) / 2) * lineHeight}">${escapeXml(line)}</tspan>`,
  ).join('')

  return { fontSize, spans }
}

export const renderOgSvg = ({ title, size, colors, art }: ImageOptions) => {
  const { width, height, cellSize } = sizes[size]
  const gridWidth = gridColumns * cellSize
  const gridHeight = gridRows * cellSize
  // Keep the last row and its background filled through the filter's displacement.
  const gridBleed = 6
  const artX = (width - gridWidth) / 2
  const footerHeight = height - gridHeight
  const renderedTitle = renderTitle(title, size, width, gridHeight, footerHeight)
  if (!renderedTitle) return null
  const { fontSize, spans } = renderedTitle
  const gridLines = renderGridLines(artX, cellSize, gridWidth, gridHeight + gridBleed)
  const pixelArtSvg = renderPixelArt(art, colors, artX, cellSize, gridBleed)

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="1" result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G" />
    </filter>
  </defs>
  <rect width="${width}" height="${footerHeight}" y="${gridHeight}" x="0" fill="${colors.accent}"/>
  <g filter="url(#noise)">
    <rect x="${artX}" width="${gridWidth}" height="${gridHeight + gridBleed}" fill="${colors.background}" />
    <path d="${gridLines}" fill="none" stroke="${colors.accent}" stroke-width="3" />
    ${pixelArtSvg}
  </g>
  <rect width="${width}" height="${height}" fill="none" stroke="${colors.accent}" stroke-width="15" />
  <text dominant-baseline="middle" text-anchor="start" fill="${colors.background}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" letter-spacing="-0.083em">${spans}</text>
</svg>`
}
