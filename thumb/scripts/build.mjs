import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { generator, projectRoot, readCatalog } from './core.mjs'
import { recoverOutput, replaceOutput } from './output.mjs'

export const buildCatalog = async ({ catalogFile, destination = join(projectRoot, 'dist') } = {}) => {
  await recoverOutput(destination)
  const catalog = await readCatalog(catalogFile)
  const staging = await mkdtemp(join(dirname(destination), '.thumb-build-'))

  try {
    await mkdir(join(staging, 'og'), { recursive: true })
    for (const item of catalog) {
      const itemDir = join(staging, 'og', item.slug)
      await mkdir(itemDir, { recursive: true })
      for (const size of Object.keys(generator.sizes)) {
        const svg = generator.renderOgSvg({ title: item.title, size, colors: item.colors, art: item.pixelArt })
        if (!svg) throw new Error(`${item.slug}: title does not fit ${size}`)
        const jpeg = await sharp(Buffer.from(svg))
          .flatten({ background: item.colors.background })
          .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
          .toBuffer()
        await writeFile(join(itemDir, `${size}.jpg`), jpeg)
      }
    }
    await replaceOutput(staging, destination)
    return catalog.length
  } finally {
    await rm(staging, { recursive: true, force: true })
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const count = await buildCatalog()
  console.log(`Generated ${count * Object.keys(generator.sizes).length} JPEGs from ${count} thumbnails in dist/og/.`)
}
