import type { NodePluginArgs } from 'gatsby'
import type { PluginOptionsSchemaJoi, ObjectSchema } from 'gatsby-plugin-utils'
import type { DefaultTreeAdapterTypes as parse5 } from 'parse5'
import type Filesystem from './filesystem'
import type { File, FileGeneric, FileHtml } from './files'

// Available processing strategies
export type IOptionProcessingStrategy = 'sequential' | 'parallel'

// Processing options interface
export interface IOptionProcessing {
  concurrency: number
  strategy: IOptionProcessingStrategy
}

// Extensio options interface
export type IExtensionOptions<
  O = {
    [option: string]: any
  },
> = IOptionProcessing & O

/**
 * Plugin options interface
 */
export type IOptions = {
  enabled: boolean
  reporting:
    | {
        log: boolean
        console: boolean
      }
    | boolean
  ignore: string[]
  events: ITaskApiEvents<any>
  processing: IOptionProcessing
  extensions: {
    [ext: string]: Partial<IExtensionOptions>
  }
} & {
  [task: string]: ITaskOptions
}

/**
 * Generic type for async/sync functions
 */
type Fn<A extends any[], R> = (...args: A) => Promise<R> | R

/**
 * Interface for an event callback
 */
type IEvent<
  O extends ITaskOptions,
  P extends Object = {},
  F extends File | undefined = undefined,
  R = void,
> = Fn<[IPostbuildArg<O, F, P>], R>

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
    configure: IEvent<O, { config: IExtensionOptions }>
    parse: IEvent<O, { html: string }, FileHtml, string>
    tree: IEvent<O, {}, FileHtml>
    node: IEvent<
      O,
      { node: parse5.Node; previousNode?: parse5.Node; nextNode?: parse5.Node },
      FileHtml
    >
    serialize: IEvent<O, {}, FileHtml>
    write: IEvent<O, { html: string }, FileHtml, string>
  }
  unknown: {
    configure: IEvent<O, { config: IExtensionOptions }>
    content: IEvent<O, { raw: string }, FileGeneric, string>
  }
}

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
export type ITaskApiEvents<O extends ITaskOptions> =
  | {
      [K in Exclude<keyof IEvents<any>, 'unknown'>]?: Partial<IEvents<O>[K]>
    }
  | {
      [glob: string]: Partial<IEvents<O>['unknown']>
    }

/**
 * Interface for task options definition
 */
export interface ITaskApiOptions<O extends ITaskOptions> {
  defaults: O
  schema: (joi: PluginOptionsSchemaJoi) => ObjectSchema
}

/**
 * Interface for a plugin task
 * @internal
 */
export interface ITask<O extends ITaskOptions> {
  id: string
  events: ITaskApiEvents<O>
  options?: ITaskApiOptions<O>
}

/**
 * Interface for the main postbuild object thats is passed
 * to all event callbacks
 */
export type IPostbuildArg<
  O extends ITaskOptions,
  F extends File | undefined = undefined,
  P extends Object = {},
> = {
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
  gatsby: NodePluginArgs
} & {
  [K in keyof P]: P[K]
}

/**
 * Map of original asset filenames to the hashed ones
 */
export type IAssetsManifest = Map<string, string>
