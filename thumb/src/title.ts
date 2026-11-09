// SVG text does not wrap on its own. These advance widths leave room around Arial Bold glyphs.
// The extra room also covers small differences in sans-serif fallback fonts.
const letterSpacingEm = -0.083
const minimumFontSize = 24
const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
const graphemes = (text: string) => Array.from(graphemeSegmenter.segment(text), ({ segment }) => segment)

const characterEmWidth = (character: string) => {
  // Keycaps and joined emoji can contain narrow ASCII characters but render as one wide glyph.
  if (Array.from(character).length > 1) return 1.25
  if (character === ' ') return 0.33
  if (/[ilI1.,:;!|']/u.test(character)) return 0.35
  if (character === '@') return 1.04
  if (/[mwMW%&]/u.test(character)) return 0.98
  if (/[A-Z]/u.test(character)) return 0.82
  if (/[0-9]/u.test(character)) return 0.62
  if (character.codePointAt(0)! > 0x7f) return 1.1
  return 0.7
}

const estimatedTextWidth = (text: string, fontSize: number) => {
  const characters = graphemes(text)
  const emWidth = characters.reduce((width, character) => width + characterEmWidth(character), 0)
  return (emWidth + Math.max(0, characters.length - 1) * letterSpacingEm) * fontSize
}

const wrapTitle = (title: string, fontSize: number, maxWidth: number) => {
  const lines: string[] = []
  let line = ''

  for (const word of title.split(/\s+/u)) {
    const withWord = line ? `${line} ${word}` : word
    if (estimatedTextWidth(withWord, fontSize) <= maxWidth) {
      line = withWord
      continue
    }
    if (line) lines.push(line)
    line = ''
    if (estimatedTextWidth(word, fontSize) <= maxWidth) {
      line = word
      continue
    }

    let lineWidth = 0
    for (const character of graphemes(word)) {
      const nextWidth = lineWidth + (characterEmWidth(character) + (line ? letterSpacingEm : 0)) * fontSize
      if (line && nextWidth > maxWidth) {
        lines.push(line)
        line = character
        lineWidth = characterEmWidth(character) * fontSize
      } else {
        line += character
        lineWidth = nextWidth
      }
    }
  }

  if (line) lines.push(line)
  return lines
}

export const layoutTitle = (title: string, baseFontSize: number, maxWidth: number, maxHeight: number) => {
  for (let fontSize = baseFontSize; fontSize >= minimumFontSize; fontSize -= 2) {
    const lines = wrapTitle(title, fontSize, maxWidth)
    const lineHeight = fontSize * 1.1
    if (lines.length * lineHeight <= maxHeight) {
      return { lines, fontSize, lineHeight }
    }
  }
  return null
}
