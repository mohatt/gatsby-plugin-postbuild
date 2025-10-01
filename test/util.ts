import _ from 'lodash'
import path from 'path'
import { vol, DirectoryJSON } from 'memfs'
import { readDirToMap } from 'vitest-memfs/util'
import type { IErrorMeta } from '@postbuild/common'
import type { IUserOptions } from '@postbuild/interfaces'
import { onPluginInit, onPostBuild } from '@postbuild/gatsby-node'

// Virtual Project Root
export const projectRoot = '/virtual/project'

// Creates a virtual project volume from real directory.
export async function createTestProject(targetDir: string) {
  const projectDir = path.join(path.dirname(expect.getState().testPath), '__fixtures__', targetDir)
  const prefix = projectRoot
  const entries = await readDirToMap(projectDir, { prefix })

  const pages: Record<string, string> = {}
  const jsonVol: DirectoryJSON = {}
  for (const entryPath in entries) {
    const entry = entries[entryPath]
    if (entry.kind === 'file') {
      jsonVol[entryPath] = entry.file.readSync()
      // derive pages from html files
      const rel = path.posix.relative(prefix, entryPath)
      if (rel.startsWith('public/') && rel.endsWith('.html')) {
        const parts = rel.slice('public'.length, -'.html'.length).split('/')
        const l = parts.length - 1
        if (parts[l] === 'extra') continue
        if (parts[l] === 'index') parts.pop()
        else if (parts[l] === '404') parts[l] = '404.html'
        pages[parts.join('/') || '/'] = rel
      }
    } else if (entry.kind === 'empty-dir') {
      jsonVol[entryPath] = null
    }
  }

  return { pages, jsonVol }
}

export function createGatsbyArgs(builtPages: string[] = []) {
  // Tracks internal plugin state
  const state = {
    errMap: {} as Record<IErrorMeta['id'], { text(context: IErrorMeta['context']): string }>,
  }
  const emitter = {
    on: vi.fn().mockImplementation((type, listener) => {
      if (type === 'HTML_GENERATED') {
        listener({ type, payload: builtPages })
      }
    }),
  }
  const activity = {
    start: vi.fn(),
    setStatus: vi.fn(),
    panic: vi.fn(),
    end: vi.fn(),
  }
  const reporter = {
    verbose: vi.fn(),
    info: vi.fn(),
    warn: vi.fn().mockImplementation((message) => {
      const error = new Error(message)
      error.name = 'Warning'
      throw error
    }),
    panic: vi.fn().mockImplementation(({ id, error, context }: IErrorMeta) => {
      throw { text: state.errMap[id].text(context), error }
    }),
    setErrorMap: vi.fn().mockImplementation((map) => Object.assign(state.errMap, map)),
    activityTimer: vi.fn().mockImplementation(() => activity),
    activity,
  }

  return {
    store: {
      getState: () => ({
        program: { directory: projectRoot },
      }),
    },
    emitter,
    tracing: {
      parentSpan: 'foo',
    },
    reporter,
    pathPrefix: '',
  }
}

export async function testE2E(name: string, options?: IUserOptions, positive = true) {
  const expDir = _.kebabCase(name)
  const { pages, jsonVol } = await createTestProject('project')

  // re-populate the volume
  vol.reset()
  vol.fromJSON(jsonVol)

  const args = createGatsbyArgs(Object.keys(pages))
  await onPluginInit(args as any, { ...options, plugins: [] })
  await onPostBuild(args as any)
  const {
    reporter: { activity, verbose, panic, info },
  } = args
  expect(panic.mock.calls).toMatchSnapshot('panic')
  expect(activity.panic.mock.calls).toMatchSnapshot('activity.panic')

  if (positive) {
    await expect(vol).toMatchVolumeSnapshot(expDir, { prefix: `${projectRoot}/public` })
  } else {
    expect(vol).toMatchVolume(jsonVol)
  }

  expect(verbose.mock.calls).toMatchSnapshot('verbose')
  expect(activity.setStatus.mock.calls).toMatchSnapshot('activity.setStatus')
  expect(info.mock.calls).toMatchSnapshot('info')
}

export const testHeaders = {
  '[*]': { 'X-Test-Global': 'test-value' },
  '[pages]': { link: ['<https://www.abc.com>; rel=preconnect'] },
  '[page-data]': { 'X-Test-PageData': 'test-value' },
  '[static]': { 'X-Test-Static': 'test-value' },
  '[assets]': { 'X-Test-Asset': 'test-value' },
}
