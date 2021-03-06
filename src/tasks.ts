import { Promise } from 'bluebird'
import _ from 'lodash'
import { Filesystem } from './filesystem'
import { createDebug, PostbuildError } from './common'
import type { File, FileGeneric, FileHtml } from './files'
import type { Node as parse5Node } from 'parse5'
import type { IOptions } from './options'
import type { GatsbyJoi } from './gatsby'
import type { IPostbuildArgs } from './postbuild'
const debug = createDebug('tasks')

/**
 * Generic type for async/sync functions
 */
type Fn<A extends any[], R> = (...args: A) => Promise<R>|R

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
 * Interface for an event callback
 */
type IEvent<
  F extends File | undefined,
  O extends ITaskOptions,
  P extends Object = {},
  R = void
> = Fn<[IPostbuildArgs<F, O, P>], R>

/**
 * Defines every event api within the plugin
 */
export interface IEvents<O extends ITaskOptions> {
  on: {
    bootstrap: IEvent<undefined, O>
    postbuild: IEvent<undefined, O>
    shutdown: IEvent<undefined, O>
  }
  html: {
    parse: IEvent<FileHtml, O, { html: string }, string>
    tree: IEvent<FileHtml, O>
    node: IEvent<FileHtml, O, { node: parse5Node }>
    serialize: IEvent<FileHtml, O>
    write: IEvent<FileHtml, O, { html: string }, string>
  }
  glob: {
    content: IEvent<FileGeneric, O, { raw: string }, string>
  }
}

/**
 * Event type helpers
 */
export type IEventType = keyof IEvents<any>
export type IEventName<T extends IEventType> = Keys<IEvents<any>[T], Fn<any[], any>>
export type IEventFunc<T extends IEventType, K extends IEventName<T>> = IEvents<any>[T][K]
export type IEventFuncIn<T extends IEventType, K extends IEventName<T>> = Omit<Parameters<IEventFunc<T, K>>[0], 'task'|'event'|'options'>
export type IEventFuncOut<T extends IEventType, K extends IEventName<T>, R = ReturnType<IEventFunc<T, K>>> = R extends PromiseLike<infer U> ? U : R

/**
 * Interface for task options
 */
export interface ITaskOptions {
  enabled: boolean
  ignore: string[]
}

/**
 * Interface for task events api
 * Note: This type partially works due to lack of negated types
 * @see https://github.com/Microsoft/TypeScript/pull/29317
 * @see https://github.com/microsoft/TypeScript/pull/41524
 */
export type ITaskApiEvents<O extends ITaskOptions> = {
  [K in Exclude<IEventType, 'glob'>]?: Partial<IEvents<O>[K]>
} & {
  [glob: string]: Partial<IEvents<O>['glob']>
}

/**
 * Interface for task options definition
 */
export interface ITaskApiOptions<O extends ITaskOptions> {
  defaults: O
  schema: (joi: GatsbyJoi) => GatsbyJoi
}

/**
 * Interface for task main exports
 */
export interface ITaskApi<O extends ITaskOptions> {
  events: ITaskApiEvents<O>
  options?: ITaskApiOptions<O>
}

/**
 * Interface for a plugin task
 */
export interface ITask<O extends ITaskOptions> {
  /**
   * Task ID
   */
  id: string

  /**
   * Task API entry file
   */
  main?: string

  /**
   * Task API exports
   */
  api: ITaskApi<O>
}

/**
 * Handles tasks defined within the plugin
 */
export class Tasks {
  /**
   * Tasks collection
   */
  tasks: Array<ITask<any>> = []

  /**
   * Map of filenames and task events that need them
   */
  fileEvents: {
    [file: string]: Array<[ITask<any>, string]>
  } = {}

  fs: Filesystem
  options: IOptions
  constructor (fs: Filesystem, options: IOptions) {
    this.fs = fs
    this.options = options
  }

  /**
   * Registers a new task, task exports needs to be either
   * an object or a module file to require
   */
  register<O extends ITaskOptions = any> (id: string, exports?: string|ITaskApi<O>): void {
    let main
    if (this.tasks.find(t => t.id === id) !== undefined) {
      throw new Error(`Can't register task "${id}" with duplicate id`)
    }

    if (typeof exports !== 'object') {
      main = exports === undefined
        ? `./tasks/${id}`
        : exports
      try {
        exports = require(main) as ITaskApi<O>
      } catch (e) {
        throw new Error(`Unable to resolve task entry file "${main}": ${String(e.message)}`)
      }
    }

    const task = {
      id,
      main: main !== undefined
        ? require.resolve(main)
        : undefined,
      api: exports
    }
    debug('Registered a new task', task)
    this.tasks.unshift(task)
  }

  /**
   * Sets the user-defined options for all tasks defined
   * Should be called before running any task events
   */
  setOptions (): void {
    this.tasks = this.tasks.filter(({ id, api }) => {
      const td = {
        enabled: true,
        ignore: [],
        ...api.options?.defaults
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
  getFilenames (): Promise<{ [ext: string]: string[] }> {
    const extensions = this.tasks.reduce((res: Tasks['fileEvents'], task) => {
      for (const ext in task.api.events) {
        if (ext === 'on') continue
        (res[ext] ||= []).push([task, ext])
      }
      return res
    }, {})
    const files: Tasks['fileEvents'] = {}
    const filesOrder: { [file: string]: number } = {}
    const result: { [ext: string]: string[] } = {}
    return Promise
      .map(Object.keys(extensions), (ext, i) =>
        this.fs.glob(ext.indexOf('/') === 0 ? ext.slice(1) : `**/*.${ext}`, { nodir: true })
          .then(matchs => matchs.forEach(f => {
            if (this.options.ignore.includes(f)) return
            files[f] = (files[f] ||= []).concat(extensions[ext])
            filesOrder[f] = Math.max(i, filesOrder[f] ?? 0)
          })))
      .then(() => {
        const sortedFiles = Object.entries(filesOrder).sort(([,a], [,b]) => {
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
  getOptionsSchemas (joi: GatsbyJoi): { [task: string]: GatsbyJoi } {
    return this.tasks.reduce((res: { [task: string]: GatsbyJoi }, task) => {
      const tos = task.api.options?.schema
      const schema = tos === undefined
        ? joi.object()
        : tos.call(task.api.options, joi)
      res[task.id] = schema.append({
        enabled: joi.boolean()
          .description('Whether to run the task or not'),
        ignore: joi.array().items(joi.string())
          .description('File paths to ignore for this task only')
      })
      return res
    }, {})
  }

  /**
   * Runs all callbacks attached to the given event type/name
   * and returns all their return values as an array
   */
  async run<T extends IEventType, E extends IEventName<T>> (type: T, event: E, payload: IEventFuncIn<T, E>): Promise<Array<IEventFuncOut<T, E>>>

  /**
   * Reduces the return values from all callbacks attached to
   * the given event type/name to a single value based on the
   * accumulator field provided
   */
  async run<T extends IEventType, E extends IEventName<T>> (type: T, event: E, payload: IEventFuncIn<T, E>, accumulator: keyof IEventFuncIn<T, E>): Promise<IEventFuncOut<T, E>>

  /**
   * Implementation
   * Note: We are suppressing some type errors that is due to
   * some inconsistencies with the current version of TypeScript (v4.1)
   * @see Keys
   */
  async run<T extends IEventType, E extends IEventName<T>> (type: T, event: E, payload: IEventFuncIn<T, E>, accumulator?: keyof IEventFuncIn<T, E>): Promise<Array<IEventFuncOut<T, E>>|IEventFuncOut<T, E>> {
    const events: Array<[ITask<any>, string]> = []
    // @ts-expect-error
    const file = payload?.file as File | undefined
    if (file !== undefined) {
      const fileEvents = this.fileEvents[file.relative] ?? []
      for (const fe of fileEvents) {
        if (event in fe[0].api.events[fe[1]]) events.push(fe)
      }
    } else {
      for (const task of this.tasks) {
        if (type in task.api.events && event in task.api.events[type]) {
          events.push([task, type])
        }
      }
    }
    return Promise.mapSeries(events, async ([task, et]) => {
      try {
        const args = {
          task,
          options: this.options[task.id],
          event: {
            type: et,
            name: event
          }
        }
        // @ts-expect-error
        const res = await task.api.events[et][event] // eslint-disable-line
        ({ ...args, ...payload }) // eslint-disable-line
        if (accumulator !== undefined) {
          if (typeof payload[accumulator] !== typeof res) {
            // @todo handle this gracefully
            throw new TypeError(`Return value must be of type "${typeof payload[accumulator]}"`)
          }
          payload[accumulator] = res
        }
        return res
      } catch (e) {
        throw new PostbuildError(
          `The task "${task.id}" encountered an error while running event ` +
          `"${[et, event].join('.')}": ${String(e.message)}`,
          e
        )
      }
    }).then(res => {
      if (accumulator !== undefined) {
        return res.length > 0
          ? res.pop()
          : payload[accumulator]
      }
      return res
    })
  }
}
