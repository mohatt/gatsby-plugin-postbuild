import { GatsbyJoi } from './gatsby'
import { ITaskApiEvents, ITaskOptions } from './tasks'

/**
 * Plugin options interface
 */
export type IOptions = {
  enabled: boolean
  report: boolean
  consoleReport: boolean
  ignore: string[]
  events: ITaskApiEvents<any>
  defaultConcurrency: number
  defaultStrategy: IOptionsExtStrategy
  extensions: {
    [ext: string]: {
      concurrency?: number
      strategy?: IOptionsExtStrategy
    } | undefined
  }
} & {
  [task: string]: ITaskOptions
}

// Available extension processing strategies
export type IOptionsExtStrategy = 'steps' | 'parallel'

/**
 * Default values for plugin options
 */
// @ts-expect-error
export const DEFAULTS: IOptions = {
  enabled: true,
  report: true,
  consoleReport: true,
  ignore: [],
  events: {},
  defaultStrategy: 'parallel',
  defaultConcurrency: 10,
  extensions: {
    html: {
      strategy: 'steps'
    }
  }
}

/**
 * Plugin options schema
 */
export function schema (joi: GatsbyJoi): GatsbyJoi {
  return joi.object({
    enabled: joi.boolean()
      .description('Whether to run the postbuild or not.'),
    report: joi.boolean()
      .description('Write a `/public/postbuild.log.json` with all the changes made.'),
    consoleReport: joi.boolean()
      .description('Print a summary report during build with all the changes made.'),
    ignore: joi.array().items(joi.string())
      .description('File paths to exclude from processing.'),
    events: joi.object({
      on: joi.object().pattern(
        joi.string()
          .valid('bootstrap', 'postbuild', 'shutdown'),
        joi.function()),
      html: joi.object().pattern(
        joi.string()
          .valid('parse', 'tree', 'node', 'serialize', 'write'),
        joi.function())
    }).pattern(joi.string(), joi.object({
      content: joi.function()
    }))
      .description('Set of events to added as a custom postbuild task.'),
    extensions: joi.object().pattern(joi.string(), joi.object({
      concurrency: joi.number().min(1)
        .description('How many files to process at once.'),
      strategy: joi.string()
        .valid('steps', 'parallel')
        .description('Determines how the files are processed.')
    }))
      .description('Changes how files of a specific extension are processed.'),
    defaultStrategy: joi.string()
      .valid('steps', 'parallel')
      .description('Determines how the files are processed.'),
    defaultConcurrency: joi.number().min(1)
      .description('How many files to process at once.')
  })
}
