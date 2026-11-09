# thumb

Thumbnail designs live in the checked-in [catalog.json](catalog.json). The generator renders every entry at all three sizes on every build, so styling changes update existing thumbnails too. The local editor previews SVGs; the published assets are JPEGs.

The square image enlarges the 24 × 9 pixel grid and crops four columns from each side.

## Edit locally

```sh
cd thumb
npm ci
npm run dev
```

Open `http://127.0.0.1:8788/`

## Build and deploy

```sh
npm run build
npm run deploy
```

Published paths use these sizes:

- `https://thumb.on-a.website/og/<slug>/1200x630.jpg`
- `https://thumb.on-a.website/og/<slug>/1200x1200.jpg`
- `https://thumb.on-a.website/og/<slug>/1280x720.jpg`
