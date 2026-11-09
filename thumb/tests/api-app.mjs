import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const entryPoint = fileURLToPath(new URL('../src/index.ts', import.meta.url))
const bundle = await build({ entryPoints: [entryPoint], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' })
const source = Buffer.from(bundle.outputFiles[0].text).toString('base64')
export const { default: app } = await import(`data:text/javascript;base64,${source}`)
