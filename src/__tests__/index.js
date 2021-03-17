import { pluginOptionsSchema, onPreBootstrap, onPostBuild } from '../index'
import Postbuild from '../postbuild'
import { PostbuildError } from '../common'

jest.mock('../postbuild')
const postbuild = Postbuild.mock.instances[0]
const gatsbyActivity = {
  start: jest.fn(),
  setStatus: jest.fn(),
  panic: jest.fn(),
  end: jest.fn()
}
const gatsby = {
  reporter: {
    panic: jest.fn(),
    activityTimer: jest.fn().mockImplementation(() => gatsbyActivity)
  },
  tracing: {
    parentSpan: 'foo'
  }
}

describe('pluginOptionsSchema', () => {
  test('runs correctly', () => {
    expect(() => pluginOptionsSchema({})).not.toThrow()
    postbuild.getOptionsSchemas = () => { throw new Error('foo') }
    expect(() => pluginOptionsSchema({})).toThrowErrorMatchingSnapshot()
  })
})

describe('onPreBootstrap', () => {
  test('runs correctly', async () => {
    const args = [gatsby, {}]
    await expect(onPreBootstrap(...args)).resolves.toBeUndefined()
    postbuild.bootstrap = () => {
      throw new Error('foo')
    }
    await onPreBootstrap(...args)
    postbuild.bootstrap = () => {
      throw new PostbuildError('something wrong', new TypeError('foo'))
    }
    await onPreBootstrap(...args)
    expect(gatsby.reporter.panic.mock.calls).toMatchSnapshot()
  })
})

describe('onPostBuild', () => {
  test('runs correctly', async () => {
    await expect(onPostBuild(gatsby)).resolves.toBeUndefined()
    postbuild.run = () => {
      throw new Error('foo')
    }
    await onPostBuild(gatsby)
    postbuild.run = () => {
      throw new PostbuildError('something wrong', new TypeError('foo'))
    }
    await onPostBuild(gatsby)
    expect(gatsby.reporter.activityTimer.mock.calls).toMatchSnapshot()
    expect(gatsbyActivity.start.mock.calls).toMatchSnapshot()
    expect(gatsbyActivity.panic.mock.calls).toMatchSnapshot()
    expect(gatsbyActivity.end.mock.calls).toMatchSnapshot()
  })
})
