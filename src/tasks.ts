import { Promise } from 'bluebird'
import path from 'path'
import _ from 'lodash'
import globToRegexp from 'glob-to-regexp'
import { createDebug, PostbuildError } from './common'
import type { File, FileGeneric, FileHtml } from './files'
import type { Node as parse5Node } from 'parse5'
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
  R = void // eslint-disable-line @typescript-eslint/no-invalid-void-type
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
  file: {
    read: IEvent<FileGeneric, O, { data: string }, string>
    write: IEvent<FileGeneric, O, { data: string }, string>
  }
  html: {
    parse: IEvent<FileHtml, O, { html: string }, string>
    tree: IEvent<FileHtml, O>
    node: IEvent<FileHtml, O, { node: parse5Node }>
    serialize: IEvent<FileHtml, O>
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
 * Interface for a task eventType
 */
export type ITaskEvents<T extends IEventType, O extends ITaskOptions> = Partial<IEvents<O>[T]>

/**
 * Interface for task options
 */
export interface ITaskOptions {
  enabled: boolean
  ignore: string[]
}

/**
 * Interface for task events api
 * Note: This type partially works
 * @see https://github.com/Microsoft/TypeScript/pull/29317
 */
export type ITaskApiEvents<O extends ITaskOptions> = {
  [K in Exclude<IEventType, 'file'>]?: Partial<IEvents<O>[K]>
} & {
  [P in Exclude<string, IEventType>]?: Partial<IEvents<O>['file']>
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
   * Map of task ids and their final options object
   */
  options: { [task: string]: unknown & ITaskOptions } = {}

  /**
   * Map of filenames and the tasks that need them
   */
  filesTasksMap: { [file: string]: Array<ITask<any>> } = {}

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
        ? path.join(__dirname, 'tasks', id, 'index.js')
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
  setOptions (options: { [task: string]: any }): void {
    const defaults = this.getOptionsDefaults()
    this.tasks = this.tasks.filter(({ id }) => {
      this.options[id] = (options[id] !== undefined)
        ? _.clone(options[id])
        : {}
      if (defaults[id] !== undefined) {
        _.defaultsDeep(this.options[id], defaults[id])
      }
      // delete disabled tasks
      if (!this.options[id].enabled) {
        delete this.options[id]
        return false
      }
      return true
    })
    debug('Loaded tasks options', this.options)
  }

  /**
   * Returns a Map of glob patterns and the tasks
   * that defined them
   */
  getExtensionGlobs (): { [ext: string]: string[] } {
    return this.tasks.reduce((res: { [ext: string]: string[] }, task) => {
      for (const ext in task.api.events) {
        if (ext === 'on') continue
        (res[ext.indexOf('/') === 0
          ? ext.slice(1)
          : `**/*.${ext}`] ||= [])
          .push(task.id)
      }
      return res
    }, {})
  }

  /**
   * Should be called before running any file-related task events
   */
  setFilesTasksMap (map: { [file: string]: string[] }): Tasks['filesTasksMap'] {
    for (const file in map) {
      this.filesTasksMap[file] = map[file]
        .map(task => this.tasks.find(t => t.id === task) as ITask<any>)
        .filter(task => task !== undefined &&
          !this.options[task.id].ignore.includes(file))
      if (this.filesTasksMap[file].length === 0) {
        delete this.filesTasksMap[file]
      }
    }
    debug('Updated files-tasks map', this.filesTasksMap)
    return this.filesTasksMap
  }

  /**
   * Returns a map of task ids and their options defaults
   */
  getOptionsDefaults (): { [task: string]: ITaskOptions } {
    return this.tasks.reduce((res: { [task: string]: ITaskOptions }, task) => {
      const td = task.api.options?.defaults
      res[task.id] = {
        enabled: true,
        ignore: [],
        ...td
      }
      return res
    }, {})
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
    const events: Array<{
      task: ITask<any>
      eventObject: ITaskApiEvents<any>[T]
    }> = []
    // @ts-expect-error
    const file = payload?.file as File | undefined
    const tasks = file !== undefined ? this.filesTasksMap[file.relative] ?? [] : this.tasks
    for (const task of tasks) {
      const taskEventTypes = Object.keys(task.api.events)
      if (taskEventTypes.includes(type)) {
        if (event in task.api.events[type]) {
          events.push({ task, eventObject: task.api.events[type] })
        }
        continue
      }
      if (type === 'file' && file !== undefined) {
        for (const pattern of taskEventTypes) {
          if (pattern.indexOf('/') !== 0) continue
          const regexp = globToRegexp(pattern, {
            extended: true,
            globstar: true
          })
          if (regexp.test('/' + file.relative)) {
            // @ts-expect-error
            if (event in task.api.events[pattern]) {
              events.push({ task, eventObject: task.api.events[pattern] })
            }
          }
        }
      }
    }
    return Promise.mapSeries(events, async ({ task, eventObject }) => {
      try {
        const args = {
          task,
          options: this.options[task.id],
          event: { type, name: event }
        }
        // @ts-expect-error
        const res = await eventObject[event] // eslint-disable-line
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
          `"${[type, event].join('.')}": ${String(e.message)}`,
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
