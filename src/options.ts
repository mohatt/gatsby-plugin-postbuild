import { GatsbyJoi } from './gatsby'
import { ITaskApiEvents, ITaskOptions } from './tasks'

// Available extension processing strategies
export type IOptionProcessingStrategy = 'sequential' | 'parallel'
// Processing options interface
export interface IOptionProcessing {
  concurrency: number
  strategy: IOptionProcessingStrategy
}

/**
 * Plugin options interface
 */
export type IOptions = {
  enabled: boolean
  reporting: {
    log: boolean
    console: boolean
  } | boolean
  ignore: string[]
  events: ITaskApiEvents<any>
  processing: IOptionProcessing
  extensions: {
    [ext: string]: Partial<IOptionProcessing> | undefined
  }
} & {
  [task: string]: ITaskOptions
}

/**
 * Default values for plugin options
 */
// @ts-expect-error
export const DEFAULTS: IOptions = {
  enabled: true,
  reporting: true,
  ignore: [],
  events: {},
  processing: {
    strategy: 'parallel',
    concurrency: 10
  },
  extensions: {}
}

/**
 * Plugin options schema
 */
export function schema (joi: GatsbyJoi): GatsbyJoi {
  const processingSchema = joi.object({
    concurrency: joi.number().min(1)
      .description('How many files to process at once.'),
    strategy: joi.string()
      .valid('sequential', 'parallel')
      .description('Determines how the files are processed.')
  })
  const EventTypeSchema = (events?: string[]): GatsbyJoi => joi.object()
    .pattern(
      (events === undefined) ? joi.string() : joi.string().valid(...events),
      joi.function().maxArity(1)
    )
  return joi.object({
    enabled: joi.boolean()
      .description('Whether to run the postbuild or not.'),
    reporting: joi.alternatives().try(joi.object({
      log: joi.boolean()
        .description('Write a `/public/postbuild.log.json` with all the changes made.'),
      console: joi.boolean()
        .description('Print a summary report during build.')
    }), joi.boolean())
      .description('Reporting flag either as a boolean to enable/disable all reports or an object.'),
    ignore: joi.array().items(joi.string())
      .description('File paths to exclude from processing.'),
    events: joi.object({
      on: EventTypeSchema(['bootstrap', 'postbuild', 'shutdown']),
      html: EventTypeSchema(['configure', 'parse', 'tree', 'node', 'serialize', 'write'])
    }).pattern(joi.string(), EventTypeSchema())
      .description('Set of events to added as a custom postbuild task.'),
    processing: processingSchema
      .description('Default file processing options for all extensions.'),
    extensions: joi.object().pattern(joi.string(), processingSchema)
      .description('Changes how files of a specific extension are processed.')
  })
}
