import { Promise } from 'bluebird'
import path from 'path'
import _ from 'lodash'
import WebpackAssetsManifest from 'webpack-assets-manifest'
import Filesystem from './filesystem'
import Tasks from './tasks'
import { DEFAULTS, schema } from './options'
import { ERROR_MAP, debug } from './common'
import { ITaskOptions, IOptions, IOptionProcessing, File } from './index'
import type { GatsbyJoi, GatsbyNodeArgs, GatsbyPluginOptions } from './gatsby'

/**
 * Interface for the main postbuild object thats is passed
 * to all event callbacks
 */
export type IPostbuildArg<O extends ITaskOptions, F extends File | undefined = undefined, P extends Object = {}> = {
  /**
   * Options for current task
   */
  options: O

  /**
   * Reference to current File instance being processed
   */
  file: F

  /**
   * Current event being excuted
   */
  event: {
    type: string
    name: string
  }

  /**
   * Reference to Filesystem instance
   */
  filesystem: Filesystem

  /**
   * Reference to AssetsManifest instance
   */
  assets: IAssetsManifest

  /**
   * Reference to Gatsby node helpers object
   */
  gatsby: GatsbyNodeArgs
} & {
  [K in keyof P]: P[K]
}

/**
 * Map of original asset filenames to the hashed ones
 */
export type IAssetsManifest = Map<string, string>

/**
 * Handles core plugin functionality
 * @internal
 */
export class Postbuild {
  /**
   * Plugin options
   */
  private readonly options: IOptions

  /**
   * Files being processed by the plugin
   */
  private files: {
    [path: string]: File[]
  } = {}

  /**
   * Dependencies
   */
  private readonly fs: Filesystem
  private readonly tasks: Tasks
  private readonly manifest: { [key: string]: string }
  private manifestMap: IAssetsManifest

  /**
   * Loads dependencies and sets default options
   */
  constructor (tasks?: Tasks, fs?: Filesystem) {
    this.options = { ...DEFAULTS }
    this.fs = fs ?? new Filesystem(this.options)
    this.tasks = tasks ?? new Tasks(this.fs, this.options)
    this.manifest = {}
    this.manifestMap = new Map()
  }

  /**
   * Registers core tasks
   */
  init (tasks: string[]): void {
    tasks.forEach(task => this.tasks.register(task))
  }

  /**
   * Returns the webpack config object for the given stage
   */
  getWebpackConfig (stage: string): Object {
    if (stage !== 'build-javascript') {
      return {}
    }

    return {
      plugins: [
        new WebpackAssetsManifest({
          assets: this.manifest,
          customize (entry: any) {
            const entryName = entry.key.toLowerCase() as string
            if (entryName.endsWith('.map') || entryName.endsWith('.txt')) {
              return false
            }
          }
        })
      ]
    }
  }

  /**
   * Returns the final plugin options schema
   */
  getOptionsSchemas (joi: GatsbyJoi): GatsbyJoi {
    return schema(joi).append(this.tasks.getOptionsSchemas(joi))
  }

  /**
   * Loads user-defined options, environment constants and task options
   */
  async bootstrap (gatsby: GatsbyNodeArgs, pluginOptions: GatsbyPluginOptions): Promise<void> {
    // Merge user-defined options with defaults
    _.merge(this.options, pluginOptions)

    // Configure fs root
    this.fs.setRoot(path.join(gatsby.store.getState().program.directory, 'public'))

    // Initialize reporter
    if (typeof gatsby.reporter.setErrorMap === 'function') {
      gatsby.reporter.setErrorMap(ERROR_MAP)
    }

    // Register user task if events is set
    if (!_.isEmpty(this.options.events)) {
      this.tasks.register('user', {
        events: this.options.events
      })
    }

    // Load tasks options
    this.tasks.setOptions()

    // No need to run the plugin if there is no tasks enabled
    if (this.tasks.getActiveTasks().length === 0) {
      this.options.enabled = false
      return
    }

    // Run on.bootstrap events
    await this.tasks.run('on', 'bootstrap', {
      file: undefined,
      filesystem: this.fs,
      assets: this.manifestMap,
      gatsby
    })
    debug('Postbuild initialized', this)
  }

  /**
   * Searches for and processes all files defined by all tasks
   */
  async run (gatsby: GatsbyNodeArgs, setStatus: (s: string) => void): Promise<void> {
    if (!this.options.enabled) return

    this.manifestMap = new Map(Object.entries(this.manifest))
    // Run on.postbuild events
    const payload = {
      file: undefined,
      filesystem: this.fs,
      assets: this.manifestMap,
      gatsby
    }
    await this.tasks.run('on', 'postbuild', payload)

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

    // Get filenames then create a File instance for every file based on extension
    // Group files per extension and process them in series
    await this.tasks.getFilenames()
      .then(async filenames => {
        for (const ext in filenames) {
          status.total += filenames[ext].length
          const config = Object.assign({},
            this.options.processing,
            this.options.extensions[ext]
          )
          await this.tasks.run(ext as 'unknown', 'configure', { ...payload, config })
          this.files[ext] = filenames[ext].map(file => File.factory(ext, file, config, {
            filesystem: this.fs,
            tasks: this.tasks,
            assets: this.manifestMap,
            gatsby
          }))
          await this.process(ext, config, tick)
        }
      })

    // Run on.shutdown events
    await this.tasks.run('on', 'shutdown', payload)

    // Write the full postbuild report
    const { reporting } = this.options
    if (reporting === true || (typeof reporting === 'object' && reporting.log)) {
      await this.fs.create(
        'postbuild.log.json',
        JSON.stringify(this.fs.reporter.getReports(), null, 2)
      )
    }

    const saving = this.fs.reporter.getTotalSaved()
    setStatus(`Done processing ${status.total} files` + (
      saving[0] > 0
        ? ` saving a total of ${saving[1]}`
        : ''
    ))
  }

  /**
   * Processes files of a given extension using the given processing options
   */
  async process (ext: string, options: IOptionProcessing, tick: Function): Promise<void> {
    const files = this.files[ext]
    if (files === undefined) return
    debug(`Processing ${files.length} files with extension "${ext}" using`, options)
    const strat = options.strategy
    const conc = { concurrency: options.concurrency }
    // Process all files at one step all at the same time
    if (strat === 'parallel') {
      await Promise.map(files, (file, i) => {
        return file.read()
          .then(() => { tick('read'); return file.process() })
          .then(() => { tick('process'); return file.write() })
          .then(() => { tick('write'); delete files[i] })
      }, conc)
      return
    }

    // Process files in 3 steps with the last step being run in sequential order
    await Promise.map(files, file => file.read().then(() => tick('read')), conc)
    await Promise.map(files, file => file.process().then(() => tick('process')), conc)
    await Promise.each(files, (file, i) => file.write().then(() => {
      tick('write')
      delete files[i]
    }))
  }
}

/** @internal */
export default Postbuild
