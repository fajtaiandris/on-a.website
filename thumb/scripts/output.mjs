import { lstat, rename, rm } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'

const previousPath = (destination) => join(dirname(destination), `.thumb-build-previous-${basename(destination)}`)

const exists = async (path) => {
  try {
    await lstat(path)
    return true
  } catch (error) {
    if (error.code === 'ENOENT') return false
    throw error
  }
}

export const recoverOutput = async (destination, move = rename) => {
  if (await exists(destination)) return
  try {
    await move(previousPath(destination), destination)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
}

export const replaceOutput = async (staging, destination, { move = rename, remove = rm } = {}) => {
  const previous = previousPath(destination)
  await recoverOutput(destination, move)
  if (await exists(previous)) await remove(previous, { recursive: true, force: true })
  let movedPrevious = false
  try {
    await move(destination, previous)
    movedPrevious = true
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }

  try {
    await move(staging, destination)
  } catch (error) {
    if (movedPrevious) {
      try {
        await move(previous, destination)
      } catch (restoreError) {
        throw new AggregateError([error, restoreError], `Build failed; previous output remains at ${previous}.`)
      }
    }
    throw error
  }

  if (movedPrevious) await remove(previous, { recursive: true, force: true })
}
