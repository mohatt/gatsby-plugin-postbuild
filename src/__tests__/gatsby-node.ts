import { MockedObject } from 'vitest'
import {
  pluginOptionsSchema,
  onPluginInit,
  onCreateWebpackConfig,
  onPostBuild,
} from '../gatsby-node'
import Postbuild from '../postbuild'
import { PluginError } from '../common'

vi.mock('../postbuild')
const postbuild = (Postbuild as any).mock.instances[0] as MockedObject<Postbuild>

const gatsbyActivity = {
  start: vi.fn(),
  setStatus: vi.fn(),
  panic: vi.fn(),
  end: vi.fn(),
}
const gatsby = {
  reporter: {
    activityTimer: vi.fn().mockImplementation(() => gatsbyActivity),
  },
  tracing: {
    parentSpan: 'foo',
  },
  emitter: {
    on: () => {},
  },
}

describe('pluginOptionsSchema', () => {
  test('runs correctly', () => {
    expect(() => pluginOptionsSchema({} as any)).not.toThrow()
    postbuild.getOptionsSchemas.mockImplementationOnce(() => {
      throw new Error('foo')
    })
    expect(() => pluginOptionsSchema({} as any)).toThrowErrorMatchingSnapshot()
    expect(postbuild.getOptionsSchemas.mock.calls).toMatchSnapshot()
  })
})

describe('onPluginInit', () => {
  test('runs correctly', async () => {
    const args = [gatsby, {}] as [any, any]
    await expect(onPluginInit(...args)).resolves.toBeUndefined()
    postbuild.bootstrap.mockImplementationOnce(() => {
      throw new Error('foo')
    })
    await expect(onPluginInit(...args)).rejects.toThrowErrorMatchingSnapshot()
    postbuild.bootstrap.mockImplementationOnce(() => {
      throw new PluginError('something wrong', new TypeError('foo'))
    })
    await expect(onPluginInit(...args)).rejects.toThrowErrorMatchingSnapshot()
    expect(postbuild.bootstrap.mock.calls).toMatchSnapshot()
  })
})

describe('onCreateWebpackConfig', () => {
  test('runs correctly', () => {
    const args = {
      actions: { setWebpackConfig: vi.fn() },
      stage: 'test-stage',
    }
    expect(() => onCreateWebpackConfig(args as any)).not.toThrow()
    postbuild.getWebpackConfig.mockImplementationOnce(() => {
      throw new Error('foo')
    })
    expect(() => onCreateWebpackConfig(args as any)).toThrowErrorMatchingSnapshot()
    expect(postbuild.getWebpackConfig.mock.calls).toMatchSnapshot()
  })
})

describe('onPostBuild', () => {
  test('runs correctly', async () => {
    await expect(onPostBuild(gatsby as any)).resolves.toBeUndefined()
    postbuild.run.mockImplementationOnce(() => {
      throw new Error('foo')
    })
    await onPostBuild(gatsby as any)
    postbuild.run.mockImplementationOnce(() => {
      throw new PluginError('something wrong', new TypeError('foo'))
    })
    await onPostBuild(gatsby as any)
    expect(gatsby.reporter.activityTimer.mock.calls).toMatchSnapshot()
    expect(gatsbyActivity.start.mock.calls).toMatchSnapshot()
    expect(gatsbyActivity.panic.mock.calls).toMatchSnapshot()
    expect(gatsbyActivity.end.mock.calls).toMatchSnapshot()
    expect(postbuild.run).toBeCalledTimes(3)
  })
})
