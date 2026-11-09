import { randomUUID } from 'node:crypto'
import { readFile, rename, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import * as generator from '../.generated/generator.mjs'

export const projectRoot = fileURLToPath(new URL('../', import.meta.url))
export const catalogPath = fileURLToPath(new URL('../catalog.json', import.meta.url))

export { generator }

export const readCatalog = async (path = catalogPath) => generator.parseCatalog(JSON.parse(await readFile(path, 'utf8')))

export const writeCatalog = async (catalog, path = catalogPath) => {
  const validated = generator.parseCatalog(catalog)
  const temporaryPath = `${path}.${randomUUID()}.tmp`
  try {
    await writeFile(temporaryPath, `${JSON.stringify(validated, null, 2)}\n`, { flag: 'wx' })
    await rename(temporaryPath, path)
  } finally {
    await rm(temporaryPath, { force: true })
  }
  return validated
}
