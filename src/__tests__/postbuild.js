import { testPluginOptionsSchema } from 'gatsby-plugin-utils'
import optionsFixtures from '#/__fixtures__/options'
import Postbuild from '~/postbuild'
import { File } from '~/files'
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
    }
  }

  const cases = [
    {
      title: 'correctly loads without options',
      options: {}
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
    test(title, async () => {
      const postbuild = new Postbuild(tasks, filesystem)
      await expect(postbuild.bootstrap(gatsby, options)).resolves.toBe(undefined)
      expect(postbuild.options).toMatchObject(Object.keys(options).length ? options : DEFAULTS)
      expect(filesystem.setRoot).toBeCalledWith('/foo/bar/public')
      expect(tasks.register.mock.calls[0]).toMatchObject(['user', { events: options.events || {} }])
      expect(tasks.setOptions).toBeCalledTimes(1)
      expect(tasks.run.mock.calls[0]).toMatchObject(['on', 'bootstrap', { filesystem, gatsby }])
    })
  }
})

describe('run', () => {
  const file = {
    read: jest.fn().mockImplementation(() => Promise.resolve()),
    process: jest.fn().mockImplementation(() => Promise.resolve()),
    write: jest.fn().mockImplementation(() => Promise.resolve())
  }
  File.factory = jest.fn().mockImplementation(() => file)
  const tasks = {
    getFilenames: () => Promise.resolve({
      foo: ['file1.foo', 'file2.foo'],
      bar: ['file1.bar', 'file2/file2.bar']
    }),
    run: jest.fn()
  }
  const setStatus = jest.fn()
  const filesystem = {
    create: jest.fn(),
    reporter: {
      getReports: jest.fn().mockImplementation(() => ['report1', 'report2']),
      getTotalSaved: jest.fn().mockImplementation(() => [5, 5])
    }
  }
  const gatsby = {}

  beforeEach(() => {
    setStatus.mockClear()
    tasks.run.mockClear()
    file.read.mockClear()
    file.process.mockClear()
    file.write.mockClear()
    filesystem.create.mockClear()
    filesystem.reporter.getReports.mockClear()
    filesystem.reporter.getTotalSaved.mockClear()
  })

  const cases = [
    {
      title: 'correctly writes report file',
      options: {
        report: true
      }
    },
    {
      title: 'correctly ignores writing report file',
      options: {
        report: false
      }
    }
  ]

  for (const { title, options } of cases) {
    test(title, async () => {
      const postbuild = new Postbuild(tasks, filesystem)
      postbuild.options = { ...postbuild.options, ...options }
      await expect(postbuild.run(gatsby, setStatus)).resolves.toBe(undefined)
      expect(tasks.run.mock.calls[0]).toMatchObject(['on', 'postbuild', { filesystem, gatsby }])
      expect(filesystem.reporter.getReports).toBeCalled()
      expect(filesystem.reporter.getTotalSaved).toBeCalled()
      expect(filesystem.create.mock.calls).toMatchSnapshot()
    })
  }

  const stratCases = [
    {
      title: 'correctly runs parallel strat',
      options: {
        defaultStrategy: 'parallel',
        defaultConcurrency: 1
      }
    },
    {
      title: 'correctly runs steps strat',
      options: {
        defaultStrategy: 'steps',
        defaultConcurrency: 1
      }
    },
    {
      title: 'correctly runs mixed strats',
      options: {
        extensions: {
          foo: { strategy: 'steps', concurrency: 1 },
          bar: { strategy: 'parallel', concurrency: 1 }
        }
      }
    }
  ]
  for (const { title, options } of stratCases) {
    test(title, async () => {
      const postbuild = new Postbuild(tasks, filesystem)
      postbuild.options = { ...postbuild.options, ...options }
      await expect(postbuild.run(gatsby, setStatus)).resolves.toBe(undefined)
      expect(setStatus.mock.calls).toMatchSnapshot()
      expect(file.read.mock.calls.length).toBe(4)
      expect(file.process.mock.calls.length).toBe(4)
      expect(file.write.mock.calls.length).toBe(4)
    })
  }
})

describe('shutdown', () => {
  const tasks = { run: jest.fn() }
  const filesystem = {}
  const gatsby = {}

  test('title', async () => {
    const postbuild = new Postbuild(tasks, filesystem)
    await expect(postbuild.shutdown(gatsby)).resolves.toBe(undefined)
    expect(tasks.run.mock.calls[0]).toMatchObject(['on', 'shutdown', { filesystem, gatsby }])
  })
})
