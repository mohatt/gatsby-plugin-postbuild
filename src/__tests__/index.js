import { testPluginOptionsSchema } from 'gatsby-plugin-utils'
import { pluginOptionsSchema, onPreBootstrap, onPostBuild } from '~/index'
import Postbuild from '~/postbuild'
import { schema } from '~/options'
import { PostbuildError } from '~/common'
import optionsFixtures from '#/__fixtures__/options'

jest.mock('~/postbuild')
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
  const postbuild = Postbuild.mock.instances[0]
  test('runs correctly', () => {
    expect(() => pluginOptionsSchema({})).not.toThrow()
    postbuild.getOptionsSchemas = () => { throw new Error('foo') }
    expect(() => pluginOptionsSchema({})).toThrowErrorMatchingSnapshot()
  })

  describe('validates user options against schema', () => {
    for (const { title, options } of optionsFixtures) {
      test(title, async () => {
        postbuild.getOptionsSchemas = joi => schema(joi)
        const { isValid, errors } = await testPluginOptionsSchema(pluginOptionsSchema, options)
        expect(isValid).toMatchSnapshot()
        expect(errors).toMatchSnapshot()
      })
    }
  })
})

describe('onPreBootstrap', () => {
  const postbuild = Postbuild.mock.instances[0]
  test('runs correctly', async () => {
    const args = [gatsby, {}]
    await expect(onPreBootstrap(...args)).resolves.toBeUndefined()
    postbuild.bootstrap = () => {
      throw new Error('foo')
    }
    onPreBootstrap(...args)
    postbuild.bootstrap = () => {
      throw new PostbuildError('something wrong', new TypeError('foo'))
    }
    onPreBootstrap(...args)
    expect(gatsby.reporter.panic.mock.calls).toMatchSnapshot()
  })
})

describe('onPostBuild', () => {
  const postbuild = Postbuild.mock.instances[0]
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
