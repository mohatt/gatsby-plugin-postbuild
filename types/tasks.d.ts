import type { Node as parse5Node } from 'parse5'
import type { GatsbyJoi } from './gatsby'
import type { IPostbuildArg, IOptionProcessing, File, FileGeneric, FileHtml } from './index'
/**
 * Generic type for async/sync functions
 */
declare type Fn<A extends any[], R> = (...args: A) => Promise<R> | R
/**
 * Interface for an event callback
 */
declare type IEvent<O extends ITaskOptions, P extends Object = {}, F extends File | undefined = undefined, R = void> = Fn<[IPostbuildArg<O, F, P>], R>
/**
 * Defines every event api within the plugin
 */
export interface IEvents<O extends ITaskOptions> {
  on: {
    bootstrap: IEvent<O>
    postbuild: IEvent<O>
    shutdown: IEvent<O>
  }
  html: {
    configure: IEvent<O, {
      config: IOptionProcessing
    }>
    parse: IEvent<O, {
      html: string
    }, FileHtml, string>
    tree: IEvent<O, {}, FileHtml>
    node: IEvent<O, {
      node: parse5Node
    }, FileHtml>
    serialize: IEvent<O, {}, FileHtml>
    write: IEvent<O, {
      html: string
    }, FileHtml, string>
  }
  unknown: {
    configure: IEvent<O, {
      config: IOptionProcessing
    }>
    content: IEvent<O, {
      raw: string
    }, FileGeneric, string>
  }
}
/**
 * Event type helpers
 */
declare type IEventType = keyof IEvents<any>
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
export declare type ITaskApiEvents<O extends ITaskOptions> = {
  [K in Exclude<IEventType, 'unknown'>]?: Partial<IEvents<O>[K]>;
} & {
  [glob: string]: Partial<IEvents<O>['unknown']>
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
export {}
