import { Promise } from 'bluebird'
import path from 'path'
import _ from 'lodash'
import { Filesystem } from './filesystem'
import { Tasks, ITask, ITaskOptions } from './tasks'
import { File } from './files'
import { DEFAULTS, schema, IOptions } from './options'
import { CORE_TASKS, ERROR_MAP, debug } from './common'
import type { GatsbyJoi, GatsbyNodeArgs, GatsbyPluginOptions } from './gatsby'

/**
 * Interface for the main postbuild object thats is passed
 * to all event callbacks
 */
export type IPostbuildArgs<F extends File | undefined, O extends ITaskOptions, P extends Object = {}> = {
  /**
   * Current active task
   */
  task: ITask<O>

  /**
   * Options for current task
   */
  options: O

  /**
   * Current file being processed
   */
  file: F

  /**
   * Current event metadata
   */
  event: {
    type: string
    name: string
  }

  /**
   * Instance of the filesystem class
   */
  filesystem: Filesystem

  /**
   * Gatsby node helpers
   */
  gatsby: GatsbyNodeArgs
} & {
  [K in keyof P]: P[K]
}

/**
 * Handles core plugin functionality
 */
export class Postbuild {
  /**
   * Plugin options
   */
  options: IOptions = DEFAULTS

  /**
   * Dependencies
   */
  fs: Filesystem
  tasks: Tasks
  gatsby?: GatsbyNodeArgs

  /**
   * Loads dependencies and sets default options
   */
  constructor (tasks?: Tasks, fs?: Filesystem) {
    this.fs = fs ?? new Filesystem(this.options)
    this.tasks = tasks ?? new Tasks(this.fs, this.options)
  }

  /**
   * Registers core tasks
   */
  initTasks (): void {
    CORE_TASKS.forEach(task => this.tasks.register(task))
  }

  /**
   * Returns the final plugin options schema
   */
  getOptionsSchemas (joi: GatsbyJoi): GatsbyJoi {
    return schema(joi).append(this.tasks.getOptionsSchemas(joi))
  }

  /**
   * Loads user-defined options, environment options and task options
   */
  async bootstrap (gatsby: GatsbyNodeArgs, pluginOptions: GatsbyPluginOptions): Promise<void> {
    // Merge user-defined options with defaults
    _.merge(this.options, pluginOptions)

    // Configure fs root
    this.fs.setRoot(
      path.join(gatsby.store.getState().program.directory, 'public'),
      gatsby.pathPrefix
    )

    // Initialize reporter
    if (typeof gatsby.reporter.setErrorMap === 'function') {
      gatsby.reporter.setErrorMap(ERROR_MAP)
    }

    // Register user task
    this.tasks.register('user', {
      events: this.options.events
    })

    // Loads tasks options
    this.tasks.setOptions()

    // Run on.bootstrap events
    await this.tasks.run('on', 'bootstrap', {
      file: undefined,
      filesystem: this.fs,
      gatsby
    })
    debug('Postbuild initialized', this)
  }

  /**
   * Searches for and processes all files defined by all tasks
   */
  async run (gatsby: GatsbyNodeArgs, setStatus: (s: string) => void): Promise<void> {
    if (!this.options.enabled) return
    // Set gatsby object so it can be used by file handlers
    this.gatsby = gatsby
    // Run on.postbuild events
    await this.tasks.run('on', 'postbuild', {
      file: undefined,
      filesystem: this.fs,
      gatsby
    })

    // Activity status updater
    const status = {
      total: 0,
      read: 0,
      process: 0,
      write: 0
    }
    const tick = (tag: keyof typeof status): void => {
      status[tag]++
      setStatus(
        `Loaded ${status.read}/${status.total} ` +
        `Processed ${status.process}/${status.total} ` +
        `Wrote ${status.write}/${status.total}`
      )
    }

    const files: { [p: string]: File[] } = {}
    await this.tasks.getFilenames()
      .then(filenames => {
        for (const ext in filenames) {
          status.total += filenames[ext].length
          files[ext] = filenames[ext].map(file => File.factory(ext, file, this))
        }
      })

    // File processing options
    const defaultConcLimit = this.options.defaultConcurrency
    const defaultStrategy = this.options.defaultStrategy
    const extConfig = this.options.extensions

    /**
     * Runs file events for a specific extension
     * parallel can be set to true to process files in parallel
     */
    async function processFiles (ext: string): Promise<void> {
      const strat = extConfig[ext]?.strategy ?? defaultStrategy
      const conc = {
        concurrency: extConfig[ext]?.concurrency ?? defaultConcLimit
      }
      debug(`Processing ${files[ext].length} "${ext}" files with`, { strat, conc })
      // Process all files at one step all at the same time
      if (strat === 'parallel') {
        await Promise.map(files[ext], (file, i) => {
          return file.read()
            .then(() => { tick('read'); return file.process() })
            .then(() => { tick('process'); return file.write() })
            .then(() => { tick('write'); delete files[ext][i] })
        }, conc)
        return
      }

      // Process files in 3 steps with the last step being run in sequential order
      await Promise.map(files[ext], file => file.read().then(() => tick('read')), conc)
      await Promise.map(files[ext], file => file.process().then(() => tick('process')), conc)
      await Promise.each(files[ext], (file, i) => file.write().then(() => {
        tick('write')
        delete files[ext][i]
      }))
    }

    // Run one extension at a time
    await Promise.each(Object.keys(files), ext => processFiles(ext))

    // Write the full postbuild report
    const reports = this.fs.reporter.getReports()
    if (this.options.report) {
      await this.fs.create('postbuild.log.json', JSON.stringify(reports, null, 2))
    }

    const saving = this.fs.reporter.getTotalSaved()
    setStatus(`Done processing ${status.total} files` + (
      saving[0] > 0
        ? ` saving a total of ${saving[1]}`
        : ''
    ))
  }

  /**
   * Last step of plugin lifecycle
   */
  async shutdown (gatsby: GatsbyNodeArgs): Promise<void> {
    // Run on.shutdown events
    await this.tasks.run('on', 'shutdown', {
      file: undefined,
      filesystem: this.fs,
      gatsby
    })
  }
}
