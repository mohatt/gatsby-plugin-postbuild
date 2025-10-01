import path from 'node:path'
import _ from 'lodash'
import { WebpackAssetsManifest } from 'webpack-assets-manifest'
import pLimit from 'p-limit'
import type {
  PluginOptions,
  ParentSpanPluginArgs,
  BuildArgs,
  CreateWebpackConfigArgs,
} from 'gatsby'
import type { PluginOptionsSchemaJoi, ObjectSchema } from 'gatsby-plugin-utils'
import type {
  ITask,
  IOptions,
  IOptionProcessing,
  IAssetsManifest,
  IUserOptions,
} from './interfaces'
import Filesystem from './filesystem'
import Tasks from './tasks'
import { File, FileHtml, FileType } from './files'
import { DEFAULTS, schema } from './options'
import { debug, PLUGIN, PluginReporter } from './common'

/**
 * Handles core plugin functionality
 * @internal
 */
export class Postbuild {
  /**
   * Plugin options
   */
  private options: IOptions

  /**
   * Page paths built by Gatsby during this run
   */
  private builtPaths = new Set<string>()

  /**
   * Files being processed by the plugin
   */
  private files = new Map<string, File[]>()

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
  constructor(private readonly reporter: PluginReporter) {
    this.options = { ...DEFAULTS }
    this.fs = new Filesystem()
    this.tasks = new Tasks(this.fs)
    this.manifest = {}
    this.manifestMap = new Map()
  }

  /**
   * Registers core tasks
   */
  init(tasks: ITask<any>[]) {
    tasks.forEach((task) => this.tasks.register(task))
  }

  /**
   * Returns the webpack config object for the given stage
   */
  getWebpackConfig(stage: CreateWebpackConfigArgs['stage']) {
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
  async bootstrap(gatsby: ParentSpanPluginArgs, pluginOptions: PluginOptions & IUserOptions) {
    // Merge user-defined options with defaults
    this.options = _.merge({}, DEFAULTS, pluginOptions)

    // Configure fs root
    this.fs.setRoot(path.join(gatsby.store.getState().program.directory, 'public'))

    // Initialize reporter
    this.reporter.initialize(gatsby.reporter)

    // Register user task if events is set
    if (!_.isEmpty(this.options.events)) {
      this.tasks.register({
        id: 'user',
        events: this.options.events,
      })
    }

    // Resolve tasks options
    this.options = this.tasks.resolveOptions(this.options)

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
    for (const pathCandidate of paths) {
      const normalized = pathCandidate !== '/' ? pathCandidate.replace(/\/$/, '') : pathCandidate
      this.builtPaths.add(normalized)
    }
  }

  async run(gatsby: BuildArgs) {
    if (!this.options.enabled) return
    const activity = gatsby.reporter.activityTimer(PLUGIN, {
      parentSpan: gatsby.tracing.parentSpan as any,
    })
    activity.start()
    try {
      await this.doRun(gatsby, activity.setStatus)
    } catch (e) {
      activity.panic(this.reporter.createError('onPostBuild', e))
    }
    activity.end()

    const { reporting } = this.options
    if (reporting === false || (typeof reporting === 'object' && !reporting.console)) return
    const reports = this.fs.reporter.getReports()
    if (!reports.length) return
    this.reporter.info(
      ['Report'].concat(reports.map((report) => report.getConsoleOutput())).join('\n '),
    )
  }

  /**
   * Searches for and processes all files defined by all tasks
   */
  private async doRun(gatsby: BuildArgs, setStatus: (status: string) => void) {
    this.manifestMap = new Map(Object.entries(this.manifest))
    this.files.clear()
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
      const bucket: File[] = []
      this.files.set(ext, bucket)
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
          if (!this.builtPaths.has(pagePath)) {
            this.reporter.verbose(`Skipping "${pagePath}" as it's not built in this run`)
            setStatus(`Incremental build detected, skipping`)
            return
          }
        }
        bucket.push(fileObj)
      }
      status.total += bucket.length
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
  async process(ext: string, options: IOptionProcessing, tick: Function) {
    const files = this.files.get(ext)
    if (files === undefined) return
    debug(`Processing ${files.length} files with extension "${ext}" using`, options)
    const { strategy, concurrency } = options
    const runStage = async (fn: (file: File, index: number) => Promise<void>) => {
      const limit = concurrency > 0 ? pLimit(concurrency) : undefined
      const tasks = files.map((file, index) => {
        if (!limit) {
          return fn(file, index)
        }
        return limit(() => fn(file, index))
      })
      await Promise.all(tasks)
    }
    // Process all files at one step all at the same time
    if (strategy === 'parallel') {
      await runStage(async (file, i) => {
        await file.read()
        tick('read')
        await file.process()
        tick('process')
        await file.write()
        tick('write')
        delete files[i]
      })
      return
    }

    // Process files in 3 steps with the last step being run in sequential order
    await runStage(async (file) => {
      await file.read()
      tick('read')
    })
    await runStage(async (file) => {
      await file.process()
      tick('process')
    })
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      await file.write()
      tick('write')
      delete files[i]
    }
    this.files.delete(ext)
  }
}

/** @internal */
export default Postbuild
