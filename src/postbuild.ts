import { Promise } from 'bluebird'
import path from 'path'
import _ from 'lodash'
import { Filesystem } from './filesystem'
import { ITask, ITaskOptions, Tasks } from './tasks'
import { DEFAULTS, IOptions, schema } from './options'
import { CORE_TASKS, debug, ERROR_MAP } from './common'
import type { GatsbyJoi, GatsbyNodeArgs, GatsbyPluginOptions } from './gatsby'
import { File, FileGeneric, FileHtml } from './files'

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
    this.tasks = tasks ?? new Tasks()
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
    this.options = _.merge(this.options, _.pick(pluginOptions, _.keys(DEFAULTS)))

    // Configure fs root
    this.fs.setRoot(
      path.join(gatsby.store.getState().program.directory, 'public'),
      gatsby.pathPrefix
    )

    // Initialize reporter
    if (typeof gatsby.reporter.setErrorMap === 'function') {
      gatsby.reporter.setErrorMap(ERROR_MAP)
    }
    debug('Postbuild initialized', this)

    // Loads tasks options
    this.tasks.setOptions(pluginOptions)

    // Run on.bootstrap events
    await this.tasks.run('on', 'bootstrap', {
      file: undefined,
      filesystem: this.fs,
      gatsby
    })
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

    const globs = this.tasks.getExtensionGlobs()
    if (globs === {}) return
    debug('Fetching files with glob patterns', globs)
    const matchs: { [file: string]: string[] } = {}
    const files = await Promise
      .map(Object.keys(globs), pattern => this.fs.glob(pattern, { nodir: true })
        .then(res => res.forEach(m => {
          if (this.options.ignore.includes(m)) return
          matchs[m] ??= []
          globs[pattern].forEach(task =>
            !matchs[m].includes(task) && matchs[m].push(task)
          )
        })))
      .then(() => {
        debug('Matches found by glob', matchs)
        const files = Object.keys(this.tasks.setFilesTasksMap(matchs))
        status.total = files.length
        return files.reduce((result: { [ext: string]: File[] }, relPath) => {
          const ext = this.fs.extension(relPath) as string
          (result[ext] ||= []).push(
            ext === 'html'
              ? new FileHtml(relPath, this)
              : new FileGeneric(relPath, this)
          )
          return result
        }, {})
      })

    // Bluebird concurrency limit for Promise.map
    const concLimit = { concurrency: this.options.concurrency }

    /**
     * Runs file events for a specific extension
     * parallel can be set to true to process files in parallel
     */
    async function runExtension (ext: string, parallel = true): Promise<void> {
      if (parallel) {
        await Promise.map(files[ext], (file, i) => {
          return file.read().then(() => {
            tick('read')
            return file.process()
          }).then(() => {
            tick('process')
            return file.write()
          }).then(() => {
            tick('write')
            delete files[ext][i]
          })
        }, concLimit)
        return
      }
      // Process files in steps
      await Promise.map(files[ext], file => file.read().then(() => tick('read')), concLimit)
      await Promise.map(files[ext], file => file.process().then(() => tick('process')), concLimit)
      await Promise.mapSeries(files[ext], (file, i) => file.write().then(() => {
        tick('write')
        delete files[ext][i]
      }))
    }

    await Promise.map(Object.keys(files), ext => {
      return runExtension(ext, ext !== 'html')
    })

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
