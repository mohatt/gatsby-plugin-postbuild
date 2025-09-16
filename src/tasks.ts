import { Promise } from 'bluebird'
import _ from 'lodash'
import type { PluginOptionsSchemaJoi, ObjectSchema } from 'gatsby-plugin-utils'
import type { ITask, IEvents, IOptions, ITaskOptions } from './interfaces'
import type Filesystem from './filesystem'
import type File from './files/base'
import { createDebug, PluginError } from './common'
const debug = createDebug('tasks')

/**
 * Extracts keys from O whose values match a C condition
 *
 * Note: This filters out object keys which don't fit
 * the type but it can't get a list of keys which comply
 * with the desired type
 * @see https://github.com/microsoft/TypeScript/issues/38646
 */
type Keys<O, C> = { [K in keyof O]: O[K] extends C ? K : never }[keyof O]

/**
 * Event type helpers
 */
type IEventType = keyof IEvents<any>
type IEventName<T extends IEventType> = Keys<IEvents<any>[T], (...args: any[]) => any>
type IEventFunc<T extends IEventType, K extends IEventName<T>> = IEvents<any>[T][K]
type IEventFuncIn<T extends IEventType, K extends IEventName<T>> = Omit<
  Parameters<IEventFunc<T, K>>[0],
  'task' | 'event' | 'options'
>
type IEventFuncOut<
  T extends IEventType,
  K extends IEventName<T>,
  R = ReturnType<IEventFunc<T, K>>,
> = R extends PromiseLike<infer U> ? U : R

/**
 * Handles tasks defined within the plugin
 * @internal
 */
export class Tasks {
  /**
   * Tasks collection
   */
  private tasks: Array<ITask<any>> = []

  /**
   * Map of filenames and task events that need them
   */
  private fileEvents: {
    [file: string]: Array<[ITask<any>, string]>
  } = {}

  private readonly fs: Filesystem
  private readonly options: IOptions
  constructor(fs: Filesystem, options: IOptions) {
    this.fs = fs
    this.options = options
  }

  /**
   * Registers a new task, task exports needs to be either
   * an object or a module file to require
   */
  register<O extends ITaskOptions = any>(task: ITask<O>): void {
    if (this.tasks.some((t) => t.id === task.id)) {
      throw new Error(`Can't register task "${task.id}" with duplicate id`)
    }

    if (_.isEmpty(task.events)) {
      throw new Error(`Can't register task "${task.id}" with no events`)
    }

    debug('Registered a new task', task)
    this.tasks.unshift(task)
  }

  /**
   * Sets the user-defined options for all tasks defined
   * Should be called before running any task events
   */
  setOptions(): void {
    this.tasks = this.tasks.filter(({ id, options }) => {
      const td = {
        enabled: true,
        ignore: [],
        ...options?.defaults,
      }
      if (this.options[id] === undefined) {
        this.options[id] = td
      } else {
        _.defaultsDeep(this.options[id], td)
      }
      // delete disabled tasks
      if (!this.options[id].enabled) {
        delete this.options[id]
        return false
      }
      return true
    })
  }

  /**
   * Returns a map of file extensions with file names to be processed
   */
  getFilenames(): Promise<{ [ext: string]: string[] }> {
    const extensions = this.tasks.reduce((res: Tasks['fileEvents'], task) => {
      for (const ext in task.events) {
        if (ext === 'on') continue
        ;(res[ext] ||= []).push([task, ext])
      }
      return res
    }, {})
    const files: Tasks['fileEvents'] = {}
    const filesOrder: { [file: string]: number } = {}
    const result: { [ext: string]: string[] } = {}
    return Promise.map(Object.keys(extensions), (ext, i) =>
      this.fs
        .glob(ext.indexOf('/') === 0 ? ext.slice(1) : `**/*.${ext}`, { nodir: true })
        .then((matchs) =>
          matchs.forEach((f) => {
            if (this.options.ignore.includes(f)) return
            files[f] = (files[f] ||= []).concat(extensions[ext])
            filesOrder[f] = Math.max(i, filesOrder[f] ?? 0)
          }),
        ),
    ).then(() => {
      const sortedFiles = Object.entries(filesOrder).sort(([, a], [, b]) => {
        return a - b
      })
      for (const [f] of sortedFiles) {
        files[f] = files[f].filter(([task, ext]) => {
          if (this.options[task.id].ignore.includes(f)) return false
          ext = this.fs.extension(f) as string
          result[ext] ??= []
          if (!result[ext].includes(f)) result[ext].push(f)
          return true
        })
        if (files[f].length === 0) {
          delete files[f]
        }
      }
      this.fileEvents = files
      debug('Updated file-events map', this.fileEvents)
      return result
    })
  }

  /**
   * Returns a map of task ids and their options schemas
   */
  getOptionsSchemas(joi: PluginOptionsSchemaJoi): { [task: string]: ObjectSchema } {
    return this.tasks.reduce((res: { [task: string]: ObjectSchema }, task) => {
      const tos = task.options?.schema
      const schema = tos === undefined ? joi.object() : tos.call(task.options, joi)
      res[task.id] = schema.append({
        enabled: joi.boolean().description('Whether to run the task or not'),
        ignore: joi
          .array()
          .items(joi.string())
          .description('File paths to ignore for this task only'),
      })
      return res
    }, {})
  }

  /**
   * Runs all callbacks attached to the given event type/name
   * and returns all their return values as an array
   */
  async run<T extends IEventType, E extends IEventName<T>>(
    type: T,
    event: E,
    payload: IEventFuncIn<T, E>,
  ): Promise<Array<IEventFuncOut<T, E>>>

  /**
   * Reduces the return values from all callbacks attached to
   * the given event type/name to a single value based on the
   * accumulator field provided
   */
  async run<T extends IEventType, E extends IEventName<T>>(
    type: T,
    event: E,
    payload: IEventFuncIn<T, E>,
    accumulator: keyof IEventFuncIn<T, E>,
  ): Promise<IEventFuncOut<T, E>>

  /**
   * Implementation
   * Note: We are suppressing some type errors that is due to
   * some inconsistencies with the current version of TypeScript (v4.1)
   * @see Keys
   */
  async run<T extends IEventType, E extends IEventName<T>>(
    type: T,
    event: E,
    payload: IEventFuncIn<T, E>,
    accumulator?: keyof IEventFuncIn<T, E>,
  ): Promise<Array<IEventFuncOut<T, E>> | IEventFuncOut<T, E>> {
    const events: Array<[ITask<any>, string]> = []
    // @ts-expect-error
    const file = payload.file as File | undefined
    if (file !== undefined) {
      const fileEvents = this.fileEvents[file.relative] ?? []
      for (const fe of fileEvents) {
        // no need to check for event type here
        if (event in fe[0].events[fe[1]]) events.push(fe)
      }
    } else {
      for (const task of this.tasks) {
        if (type in task.events && event in task.events[type as any]) {
          events.push([task, type])
        }
      }
    }
    return Promise.mapSeries(events, async ([task, et]) => {
      try {
        const args = {
          options: this.options[task.id],
          event: {
            type: et,
            name: event,
          },
        }
        const res = await task.events[et][event]({ ...args, ...payload })
        if (accumulator !== undefined) {
          if (typeof payload[accumulator] !== typeof res) {
            // @todo handle this gracefully
            throw new TypeError(`Return value must be of type "${typeof payload[accumulator]}"`)
          }
          payload[accumulator] = res
        }
        return res
      } catch (e) {
        throw new PluginError(
          `The task "${task.id}" encountered an error while running event ` +
            `"${[et, event].join('.')}": ${String(e.message)}`,
          e,
        )
      }
    }).then((res) => {
      if (accumulator !== undefined) {
        return res.length > 0 ? res.pop() : payload[accumulator]
      }
      return res
    })
  }

  /**
   * Returns a list of enabled tasks
   */
  getActiveTasks(): Array<ITask<any>> {
    return this.tasks.filter((task) => this.options[task.id].enabled)
  }
}

/** @internal */
export default Tasks
