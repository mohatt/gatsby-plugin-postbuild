import { GatsbyJoi } from './gatsby'
import { ITaskOptions } from './tasks'

/**
 * Plugin options interface
 */
export type IOptions = {
  enabled: boolean
  report: boolean
  consoleReport: boolean
  ignore: string[]
  concurrency: number
} & {
  [task: string]: ITaskOptions
}

/**
 * Default values for plugin options
 */
// @ts-expect-error
export const DEFAULTS: IOptions = {
  enabled: true,
  report: true,
  consoleReport: true,
  ignore: [],
  concurrency: 15
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
    concurrency: joi.number()
      .description('How many files to process at once.')
  })
}
