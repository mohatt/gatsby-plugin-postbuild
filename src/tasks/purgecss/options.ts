import _ from 'lodash'
import { defaultOptions as purgecssDefaults } from 'purgecss'
import type { ITaskApiOptions, ITaskOptions } from '~/tasks'
type PurgecssDefaults = typeof purgecssDefaults

/**
 * Extracts union type from array values
 */
type ArrayUnion<T extends readonly unknown[]> = T extends ReadonlyArray<infer A> ? A : never

/**
 * Options imported from PurgeCss
 */
export const purgecssImportedOptions = [
  'defaultExtractor',
  'safelist',
  'blocklist',
  'fontFace',
  'keyframes',
  'variables'
] as const

/**
 * Task options interface
 */
export type IOptions = ITaskOptions & {
  reportRejected: boolean
  allowSymbols: boolean
  ignoreAssets: {
    webpack: string[]
    css: string[]
    js: string[]
  }
} & Pick<PurgecssDefaults, ArrayUnion<typeof purgecssImportedOptions>>

/**
 * All options accepted by purgecss lib
 */
export type PurgecssOptions = Omit<Partial<PurgecssDefaults>, 'content'|'css'> & Pick<PurgecssDefaults, 'content'|'css'>

/**
 * Options API exports
 */
export const options: ITaskApiOptions<IOptions> = {
  defaults: {
    enabled: true,
    ignore: [],
    ignoreAssets: {
      webpack: ['app', 'polyfill'],
      css: [],
      js: []
    },
    reportRejected: true,
    allowSymbols: false,
    ..._.pick(purgecssDefaults, purgecssImportedOptions)
  },
  schema: (joi) => {
    return joi.object({
      reportRejected: joi.boolean()
        .description('Write a log file in `/public` with the rejected selectors for every file.'),
      ignoreAssets: joi.object({
        webpack: joi.array().items(joi.string())
          .description('Webpack chunck names to ignore while purging CSS.'),
        css: joi.array().items(joi.string())
          .description('CSS files to exclude from processing.'),
        js: joi.array().items(joi.string())
          .description('JavaScript files to ignore while purging CSS.')
      }).description('CSS/JavaScript files to ignore during optimization. File names should be relative to `/public` directory'),
      allowSymbols: joi.boolean()
        .description('Sets a custom PurgeCSS extractor that allows CSS selectors to contain symbols (e.g TailwindCSS).'),
      defaultExtractor: joi.function()
        .description('A custom PurgeCSS extractor to be used instead of the default one.'),
      safelist: joi.alternatives().try(
        joi.object({}).unknown(true),
        joi.array().items(joi.string())
      ).description('Selectors that are safe to leave in the final CSS.'),
      blocklist: joi.array().items(joi.string())
        .description('Selectors that are blocked from appearing in the final CSS.'),
      fontFace: joi.boolean()
        .description('Remove any unused `@font-face` rules in your css.'),
      keyframes: joi.boolean()
        .description('Remove any unused `@keyframes` rules in your css.'),
      variables: joi.boolean()
        .description('Remove any unused variables in your css.')
    })
  }
}
