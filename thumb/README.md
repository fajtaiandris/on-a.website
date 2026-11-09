# Thumbnail endpoint

Run `npm run dev` and open the local root page to edit the title and palette. Select a pixel color or Erase, then click or drag across the 24 × 9 grid with a mouse. On a touchscreen, tap cells to paint and swipe to scroll the grid. The preview page uses `/og/defaults` to load the current artwork and `/og` to render all three sizes with the same inputs.

The pixel grid is always 24 columns by 9 rows. The square layout enlarges that grid and crops its sides; the title band begins directly below the grid in every size.

If a query parameter appears more than once, its first value is used. An `accent` override also sets pixel color `1` unless color `1` is explicitly provided.

`GET /og` returns an SVG image. Query parameters:

| Parameter | Description |
| --- | --- |
| `title` | Required title text. XML-forbidden characters are rejected. A title that cannot fit in the selected image, even at the minimum font size, returns 400. |
| `size` | `1200x630` (default), `1200x1200`, or `1280x720`. |
| `colors` | Optional comma-separated `key:hex` pairs. Keys are `accent`, `background`, and `1` through `5`. Hex colors may be 3 or 6 digits, with or without `#`. Unspecified colors use the defaults in `src/design.ts`. |
| `pixelArt` | Optional rows separated by `/`. It must be exactly 9 rows of 24 cells, using only `.` (empty) or digits `1` through `5`. Omit it to use the artwork in `src/design.ts`. |

For example:

```js
const params = new URLSearchParams({
  title: 'Hello',
  size: '1200x1200',
  colors: 'accent:292929,background:c8d9c7,1:ff3366,2:00aaff',
  pixelArt: [
    ...Array(4).fill('.'.repeat(24)),
    '..........1111..........',
    ...Array(4).fill('.'.repeat(24)),
  ].join('/'),
})

const imageUrl = `https://thumb.on-a.website/og?${params}`
```
