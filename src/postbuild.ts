import { Promise } from 'bluebird'
import path from 'path'
import _ from 'lodash'
import { WebpackAssetsManifest } from 'webpack-assets-manifest'
import type { PluginOptions, NodePluginArgs } from 'gatsby'
import type { PluginOptionsSchemaJoi, ObjectSchema } from 'gatsby-plugin-utils'
import type { ITask, IOptions, IOptionProcessing, IAssetsManifest } from './interfaces'
import Filesystem from './filesystem'
import Tasks from './tasks'
import { File, FileHtml, FileType } from './files'
import { DEFAULTS, schema } from './options'
import { reporter, debug } from './common'

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
   * Page paths built by Gatsby during this run
   */
  private builtPaths: string[] = []

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
  constructor(tasks?: Tasks, fs?: Filesystem) {
    this.options = { ...DEFAULTS }
    this.fs = fs ?? new Filesystem(this.options)
    this.tasks = tasks ?? new Tasks(this.fs, this.options)
    this.manifest = {}
    this.manifestMap = new Map()
  }

  /**
   * Registers core tasks
   */
  init(tasks: ITask<any>[]): void {
    tasks.forEach((task) => this.tasks.register(task))
  }

  /**
   * Returns the webpack config object for the given stage
   */
  getWebpackConfig(stage: string): Object {
    if (stage !== 'build-javascript') {
      return {}
    }

    return {
      plugins: [
        new WebpackAssetsManifest({
          assets: this.manifest,
          customize: (entry, _, manifest) => {
            if (manifest.utils.isKeyValuePair(entry) && typeof entry.key === 'string') {
              const entryName = entry.key.toLowerCase()
              if (entryName.endsWith('.map') || entryName.endsWith('.txt')) {
                return false
              }
            }
            return entry
          },
        }),
      ],
    }
  }

  /**
   * Returns the final plugin options schema
   */
  getOptionsSchemas(joi: PluginOptionsSchemaJoi): ObjectSchema {
    return schema(joi).append(this.tasks.getOptionsSchemas(joi))
  }

  /**
   * Loads user-defined options, environment constants and task options
   */
  async bootstrap(gatsby: NodePluginArgs, pluginOptions: PluginOptions): Promise<void> {
    // Merge user-defined options with defaults
    _.merge(this.options, pluginOptions)

    // Configure fs root
    this.fs.setRoot(path.join(gatsby.store.getState().program.directory, 'public'))

    // Initialize reporter
    reporter.initialize(gatsby.reporter)

    // Register user task if events is set
    if (!_.isEmpty(this.options.events)) {
      this.tasks.register({
        id: 'user',
        events: this.options.events,
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
      gatsby,
    })
    debug('Postbuild initialized', this)
  }

  setBuildPaths(paths: string[]) {
    this.builtPaths = this.builtPaths.concat(
      paths.map((path) => (path !== '/' ? path.replace(/\/$/, '') : path)),
    )
  }

  /**
   * Searches for and processes all files defined by all tasks
   */
  async run(gatsby: NodePluginArgs, setStatus: (s: string) => void): Promise<void> {
    if (!this.options.enabled) return

    this.manifestMap = new Map(Object.entries(this.manifest))
    // Run on.postbuild events
    const payload = {
      file: undefined,
      filesystem: this.fs,
      assets: this.manifestMap,
      gatsby,
    }
    await this.tasks.run('on', 'postbuild', payload)

    // Activity status updater
    const status = {
      total: 0,
      read: 0,
      process: 0,
      write: 0,
    }
    const tick = (tag: keyof typeof status): void => {
      status[tag]++
      setStatus(
        `Loaded ${status.read}/${status.total} ` +
          `Processed ${status.process}/${status.total} ` +
          `Wrote ${status.write}/${status.total}`,
      )
    }

    // Get filenames then create a File instance for every file based on extension
    // Group files per extension and process them in series
    const filenames = await this.tasks.getFilenames()
    for (const ext in filenames) {
      const config = Object.assign({}, this.options.processing, this.options.extensions[ext])
      await this.tasks.run(ext as 'unknown', 'configure', { ...payload, config })
      this.files[ext] = []
      for (const file of filenames[ext]) {
        const fileObj = FileType.factory(ext, file, config, {
          filesystem: this.fs,
          tasks: this.tasks,
          assets: this.manifestMap,
          gatsby,
        })
        if (fileObj instanceof FileHtml) {
          const { pagePath } = fileObj
          if (pagePath.startsWith('/_gatsby/')) {
            continue
          }
          if (!this.builtPaths.includes(pagePath)) {
            reporter.verbose(`Skipping "${pagePath}" as it's not built in this run`)
            setStatus(`Incremental build detected, skipping`)
            return
          }
        }
        this.files[ext].push(fileObj)
      }
      status.total += this.files[ext].length
      await this.process(ext, config, tick)
    }

    // Run on.shutdown events
    await this.tasks.run('on', 'shutdown', payload)

    // Write the full postbuild report
    const { reporting } = this.options
    if (reporting === true || (typeof reporting === 'object' && reporting.log)) {
      await this.fs.create(
        'postbuild.log.json',
        JSON.stringify(this.fs.reporter.getReports(), null, 2),
      )
    }

    const saving = this.fs.reporter.getTotalSaved()
    setStatus(
      `Done processing ${status.total} files` +
        (saving[0] > 0 ? ` saving a total of ${saving[1]}` : ''),
    )
  }

  /**
   * Processes files of a given extension using the given processing options
   */
  async process(ext: string, options: IOptionProcessing, tick: Function): Promise<void> {
    const files = this.files[ext]
    if (files === undefined) return
    debug(`Processing ${files.length} files with extension "${ext}" using`, options)
    const strat = options.strategy
    const conc = { concurrency: options.concurrency }
    // Process all files at one step all at the same time
    if (strat === 'parallel') {
      await Promise.map(
        files,
        (file, i) => {
          return file
            .read()
            .then(() => {
              tick('read')
              return file.process()
            })
            .then(() => {
              tick('process')
              return file.write()
            })
            .then(() => {
              tick('write')
              delete files[i]
            })
        },
        conc,
      )
      return
    }

    // Process files in 3 steps with the last step being run in sequential order
    await Promise.map(files, (file) => file.read().then(() => tick('read')), conc)
    await Promise.map(files, (file) => file.process().then(() => tick('process')), conc)
    await Promise.each(files, (file, i) =>
      file.write().then(() => {
        tick('write')
        delete files[i]
      }),
    )
  }
}

/** @internal */
export default Postbuild
