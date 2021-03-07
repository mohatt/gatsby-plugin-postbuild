import { testPluginOptionsSchema } from 'gatsby-plugin-utils'
import optionsFixtures from '#/__fixtures__/options'
import Postbuild from '~/postbuild'
import { DEFAULTS } from '~/options'

describe('init', () => {
  let postbuild
  const tasks = {
    register: jest.fn(),
    getOptionsSchemas: joi => ({
      foo: joi.object({ bar: joi.string() }),
      lorem: joi.object({ ipsum: joi.boolean() })
    })
  }

  test('options defaults', () => {
    expect(() => {
      postbuild = new Postbuild(tasks, {})
      postbuild.init(['foo', 'lorem'])
    }).not.toThrow()
    expect(postbuild.options).toMatchObject(DEFAULTS)
    expect(tasks.register.mock.calls).toMatchSnapshot()
  })

  describe('options schema', () => {
    const schema = ({ Joi }) => postbuild.getOptionsSchemas(Joi)
    optionsFixtures.push({
      title: 'should validate default options',
      options: DEFAULTS
    })
    for (const { title, options } of optionsFixtures) {
      test(title, () => testPluginOptionsSchema(schema, options)
        .then(({ isValid, errors }) => {
          expect(isValid).toMatchSnapshot()
          expect(errors).toMatchSnapshot()
        })
      )
    }
  })
})

describe('bootstrap', () => {
  const tasks = {
    register: jest.fn(),
    setOptions: jest.fn(),
    run: jest.fn()
  }
  const filesystem = {
    setRoot: jest.fn()
  }
  const gatsby = {
    store: {
      getState: () => ({
        program: { directory: '/foo/bar' }
      })
    },
    reporter: {
      setErrorMap: jest.fn()
    },
    pathPrefix: ''
  }

  const cases = [
    {
      title: 'correctly loads without options',
      options: DEFAULTS
    },
    {
      title: 'correctly loads with user options',
      options: {
        report: true,
        events: { foo: { bar: () => '' } }
      }
    }
  ]

  beforeEach(() => {
    tasks.register.mockClear()
    tasks.setOptions.mockClear()
    tasks.run.mockClear()
    filesystem.setRoot.mockClear()
  })
  for (const { title, options } of cases) {
    let postbuild
    test(title, () => {
      expect(() => {
        postbuild = new Postbuild(tasks, filesystem)
        postbuild.bootstrap(gatsby, options)
      }).not.toThrow()
      expect(postbuild.options).toMatchObject(options)
      expect(filesystem.setRoot).toBeCalledWith('/foo/bar/public', '')
      expect(tasks.register.mock.calls[0]).toMatchObject(['user', { events: options.events || {} }])
      expect(tasks.setOptions).toBeCalledTimes(1)
      expect(tasks.run.mock.calls[0]).toMatchObject(['on', 'bootstrap', { filesystem, gatsby }])
    })
  }
})
