import path from 'path'
import fs from 'fs-extra'
import { fileURLToPath } from 'url'

const sanitize = (s) => (s || '').replace(/^[/\\]+/, '')
const dirOf = (url) => path.dirname(fileURLToPath(url))

function candidates(moduleUrl) {
  const dir = dirOf(moduleUrl)
  return [
    path.join(dir, '../../'),
    path.join(dir, '../../../../')
  ]
}

function resolveProjectRoot(moduleUrl) {
  const dirs = candidates(moduleUrl)
  for (const root of dirs) {
    const hasSrc = fs.pathExistsSync(path.join(root, 'src'))
    const hasApi = fs.pathExistsSync(path.join(root, 'api'))
    if (hasSrc || hasApi) return root
  }
  return dirs[1]
}

function joinProject(moduleUrl, ...segments) {
  const root = resolveProjectRoot(moduleUrl)
  const clean = segments.map(sanitize)
  return path.join(root, ...clean)
}

export function getProjectRoot(moduleUrl) {
  return resolveProjectRoot(moduleUrl)
}

export function getPath(moduleUrl, folder, ...segments) {
  return joinProject(moduleUrl, folder, ...segments)
}

export function getSrcPath(moduleUrl, ...segments) {
  return joinProject(moduleUrl, 'src', ...segments)
}

export function getApiPath(moduleUrl, ...segments) {
  return joinProject(moduleUrl, 'api', ...segments)
}

export function getDistPath(moduleUrl, ...segments) {
  return joinProject(moduleUrl, 'dist', ...segments)
}

export function getConfigPath(moduleUrl) {
  return joinProject(moduleUrl, 'src', 'sliceConfig.json')
}

export function getComponentsJsPath(moduleUrl) {
  return joinProject(moduleUrl, 'src', 'Components', 'components.js')
}
