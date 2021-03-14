import { testPluginOptionsSchema } from 'gatsby-plugin-utils'
import optionsFixtures from '#/__fixtures__/options'
import Postbuild from '~/postbuild'
import { File } from '~/files'
import { DEFAULTS } from '~/options'

// Async mock fn
jest.fnAsync = v => jest.fn().mockImplementation(() => Promise.resolve(v))

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
    run: jest.fnAsync(),
    getActiveTasks: () => [{}]
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
      title: 'correctly loads with defaults',
      options: {}
    },
    {
      title: 'correctly loads with user options',
      options: {
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
      expect(tasks.register.mock.calls).toMatchSnapshot()
      expect(tasks.setOptions).toBeCalledTimes(1)
      expect(tasks.run.mock.calls[0])
        .toMatchObject(
          ['on', 'bootstrap', { filesystem, gatsby }]
        )
    })
  }

  test('incorrectly ignores running when no active tasks', async () => {
    tasks.getActiveTasks = () => []
    const postbuild = new Postbuild(tasks, filesystem)
    await expect(postbuild.bootstrap(gatsby, {})).resolves.toBe(undefined)
    expect(postbuild.options.enabled).toBe(false)
    expect(tasks.run.mock.calls.length).toBe(0)
  })
})

describe('run', () => {
  File.factory = jest.fn()
  const tasks = {
    getFilenames: jest.fnAsync({
      foo: ['file1.foo', 'file2.foo']
    }),
    run: jest.fnAsync()
  }
  const setStatus = jest.fn()
  const filesystem = {
    create: jest.fnAsync(),
    reporter: {
      getReports: () => ['report1', 'report2'],
      getTotalSaved: () => [5, 5]
    }
  }
  const gatsby = {}

  beforeEach(() => {
    File.factory.mockClear()
    setStatus.mockClear()
    tasks.run.mockClear()
    filesystem.create.mockClear()
  })

  const runTest = (options = {}) => {
    const pb = new Postbuild(tasks, filesystem)
    pb.options = { ...pb.options, ...options }
    pb.process = jest.fn().mockImplementation((a, b, tick) => {
      [0, 0].forEach(() => {
        tick('read'); tick('process'); tick('write')
      })
    })
    return expect(pb.run(gatsby, setStatus)).resolves.toBe(undefined).then(() => {
      expect(File.factory.mock.calls)
        .toMatchObject([
          ['foo', 'file1.foo', filesystem, tasks, gatsby],
          ['foo', 'file2.foo', filesystem, tasks, gatsby]
        ])
      expect(tasks.run.mock.calls)
        .toMatchObject([
          ['on', 'postbuild', { filesystem, gatsby }],
          ['foo', 'configure', { filesystem, gatsby, config: pb.options.processing }],
          ['on', 'shutdown', { filesystem, gatsby }]
        ])
      expect(pb.process).toBeCalledTimes(1)
      return pb
    })
  }

  test('correctly runs with default options', () => runTest().then(() => {
    expect(setStatus.mock.calls).toMatchSnapshot()
  }))

  test('correctly runs with custom processing options', () => runTest({
    processing: { strategy: 'parallel', concurrency: 3 }
  }).then(pb => {
    expect(pb.process.mock.calls[0][1]).toMatchObject({
      strategy: 'parallel',
      concurrency: 3
    })
  }))

  test('correctly runs with custom extension options', () => runTest({
    extensions: {
      foo: { strategy: 'parallel', concurrency: 2 }
    }
  }).then(pb => {
    expect(pb.process.mock.calls[0][1]).toMatchObject({
      strategy: 'parallel',
      concurrency: 2
    })
  }))

  test('correctly writes log file', () => runTest({ reporting: { log: true } }).then(() => {
    expect(filesystem.create.mock.calls).toMatchSnapshot()
  }))

  test('correctly ignores writing log file', () => runTest({ reporting: { log: false } }).then(() => {
    expect(filesystem.create.mock.calls).toMatchSnapshot()
  }))
})

describe('process', () => {
  const tick = jest.fn()
  const file = {
    read: jest.fnAsync(),
    process: jest.fnAsync(),
    write: jest.fnAsync()
  }
  const files = [file, file, file, file]

  beforeEach(() => {
    tick.mockClear()
    file.read.mockClear()
    file.process.mockClear()
    file.write.mockClear()
  })

  const cases = [
    { strategy: 'parallel', concurrency: 1 },
    { strategy: 'parallel', concurrency: 2 },
    { strategy: 'parallel', concurrency: 3 },
    { strategy: 'sequential', concurrency: 1 },
    { strategy: 'sequential', concurrency: 2 },
    { strategy: 'sequential', concurrency: 3 }
  ]
  for (const c of cases) {
    test(`correctly runs with s:${c.strategy} c:${c.concurrency}`, async () => {
      const postbuild = new Postbuild({}, {})
      postbuild.files.foo = files.concat()
      await expect(postbuild.process('foo', c, tick)).resolves.toBe(undefined)
      expect(file.read.mock.calls.length).toBe(4)
      expect(file.process.mock.calls.length).toBe(4)
      expect(file.write.mock.calls.length).toBe(4)
      expect(tick.mock.calls.toString()).toMatchSnapshot()
    })
  }
})
