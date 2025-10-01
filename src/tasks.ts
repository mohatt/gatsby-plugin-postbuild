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

type IFileEventEntry = Array<[ITask<any>, string]>

/**
 * Handles tasks defined within the plugin
 * @internal
 */
export class Tasks {
  /**
   * Active tasks collection
   */
  private tasks: Array<ITask<any>> = []

  /**
   * Registered tasks collection
   */
  private readonly taskRegistry: Array<ITask<any>> = []

  /**
   * Map of filenames and task events that need them
   */
  private readonly fileEvents = new Map<string, IFileEventEntry>()
  private readonly taskOptions = new Map<string, ITaskOptions>()

  private readonly fs: Filesystem
  private ignore: string[] = []
  constructor(fs: Filesystem) {
    this.fs = fs
  }

  /**
   * Registers a new task, task exports needs to be either
   * an object or a module file to require
   */
  register<O extends ITaskOptions = any>(task: ITask<O>): void {
    if (this.taskRegistry.some((t) => t.id === task.id)) {
      throw new Error(`Can't register task "${task.id}" with duplicate id`)
    }

    if (_.isEmpty(task.events)) {
      throw new Error(`Can't register task "${task.id}" with no events`)
    }

    debug('Registered a new task', task)
    this.taskRegistry.unshift(task)
  }

  /**
   * Sets the user-defined options for all tasks defined
   * Should be called before running any task events
   */
  resolveOptions(options: IOptions) {
    this.ignore = options.ignore ?? []
    const resolvedOptions = { ...options }
    this.taskOptions.clear()
    this.tasks = []
    for (const task of this.taskRegistry) {
      const defaultOptions = {
        enabled: true,
        ignore: [],
        ...task.options?.defaults,
      } as ITaskOptions
      const userTaskOptions = resolvedOptions[task.id] as ITaskOptions
      const taskOptions = _.defaultsDeep({}, userTaskOptions, defaultOptions) as ITaskOptions

      // delete disabled tasks options
      if (!taskOptions.enabled) {
        delete resolvedOptions[task.id]
        continue
      }

      resolvedOptions[task.id] = taskOptions
      this.taskOptions.set(task.id, taskOptions)
      this.tasks.push(task)
    }
    return resolvedOptions
  }

  /**
   * Returns a map of file extensions with file names to be processed
   */
  async getFilenames(): Promise<{ [ext: string]: string[] }> {
    const extensionTasks: Tasks['fileEvents'] = new Map()
    for (const task of this.tasks) {
      for (const ext of Object.keys(task.events as Record<string, unknown>)) {
        if (ext === 'on') continue
        const entries = extensionTasks.get(ext)
        if (entries === undefined) {
          extensionTasks.set(ext, [[task, ext]])
        } else {
          entries.push([task, ext])
        }
      }
    }

    this.fileEvents.clear()
    const filesOrder = new Map<string, number>()
    const result: { [ext: string]: string[] } = {}

    const extensionEntries = Array.from(extensionTasks.entries())
    const globResults = await Promise.all(
      extensionEntries.map(async ([ext, taskEntries], index) => {
        const pattern = ext.startsWith('/') ? ext.slice(1) : `**/*.${ext}`
        const matches = await this.fs.glob(pattern, { nodir: true })
        return { matches, taskEntries, index }
      }),
    )

    for (const { matches, taskEntries, index } of globResults) {
      for (const file of matches) {
        if (this.ignore.includes(file)) continue
        const existing = this.fileEvents.get(file)
        const combined = existing === undefined ? [...taskEntries] : existing.concat(taskEntries)
        this.fileEvents.set(file, combined)
        const currentOrder = filesOrder.get(file)
        filesOrder.set(file, currentOrder === undefined ? index : Math.max(index, currentOrder))
      }
    }

    const sortedFiles = Array.from(filesOrder.entries()).sort(([, a], [, b]) => a - b)
    for (const [file] of sortedFiles) {
      const entries = this.fileEvents.get(file)
      if (!entries) {
        continue
      }
      const filtered: IFileEventEntry = []
      for (const [task, eventType] of entries) {
        const taskOptions = this.taskOptions.get(task.id)
        if (taskOptions.ignore?.includes?.(file)) {
          continue
        }
        const ext = this.fs.extension(file) as string
        result[ext] ??= []
        if (!result[ext].includes(file)) {
          result[ext].push(file)
        }
        filtered.push([task, eventType])
      }
      if (filtered.length === 0) {
        this.fileEvents.delete(file)
      } else {
        this.fileEvents.set(file, filtered)
      }
    }

    debug('Updated file-events map', this.fileEvents)
    return result
  }

  /**
   * Returns a map of task ids and their options schemas
   */
  getOptionsSchemas(joi: PluginOptionsSchemaJoi): { [task: string]: ObjectSchema } {
    return this.taskRegistry.reduce((res: { [task: string]: ObjectSchema }, task) => {
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
    const file = (payload as { file?: File }).file
    if (file) {
      const fileEvents = this.fileEvents.get(file.relative) ?? []
      for (const [task, eventType] of fileEvents) {
        const taskEventGroup = task.events[eventType as keyof IEvents<any>] as
          | Record<string, unknown>
          | undefined
        if (taskEventGroup && event in taskEventGroup) {
          events.push([task, eventType])
        }
      }
    } else {
      for (const task of this.tasks) {
        const taskEventGroup = task.events[type as keyof IEvents<any>] as
          | Record<string, unknown>
          | undefined
        if (taskEventGroup && event in taskEventGroup) {
          events.push([task, type])
        }
      }
    }
    const results: Array<IEventFuncOut<T, E>> = []
    for (const [task, et] of events) {
      try {
        const args = {
          options: this.taskOptions.get(task.id),
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
        results.push(res)
      } catch (e) {
        throw new PluginError(
          `The task "${task.id}" encountered an error while running event ` +
            `"${[et, event].join('.')}": ${String(e.message)}`,
          e,
        )
      }
    }
    if (accumulator !== undefined) {
      return results.length > 0
        ? results[results.length - 1]
        : (payload[accumulator] as IEventFuncOut<T, E>)
    }
    return results
  }

  /**
   * Returns a list of enabled tasks
   */
  getActiveTasks(): Array<ITask<any>> {
    return this.tasks.filter((task) => this.taskOptions.has(task.id))
  }
}

/** @internal */
export default Tasks
