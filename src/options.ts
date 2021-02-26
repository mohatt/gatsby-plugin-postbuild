import { GatsbyJoi } from './gatsby'
import { defaultOptions } from 'purgecss'
export type PurgeCSSOptions = typeof defaultOptions

/**
 * Plugin options interface
 */
export interface IPluginOptions {
  enabled: boolean
  report: boolean
  reportConsole: boolean
  reportRejected: boolean
  allowSymbols: boolean
  ignoreFiles: {
    webpack: string[]
    pages: string[]
    css: string[]
    js: string[]
  }
  purgecss: PurgeCSSOptions
}

/**
 * Default values for plugin options
 *  we are merging purgecss defaults as well while
 *  overridding some values
 */
export const defaults: IPluginOptions = {
  enabled: true,
  report: true,
  reportConsole: true,
  reportRejected: true,
  ignoreFiles: {
    webpack: ['app', 'polyfill'],
    pages: [],
    css: [],
    js: []
  },
  allowSymbols: false,
  purgecss: {
    ...defaultOptions
  }
}

/**
 * Plugin options schema
 */
export function schema (joi: GatsbyJoi): GatsbyJoi {
  return joi.object({
    enabled: joi.boolean()
      .description('Whether to run the purgecss task or not.'),
    report: joi.boolean()
      .description('Write a "postbuild.log.json" file in `/public` with all the changes made.'),
    reportConsole: joi.boolean()
      .description('Print a summary report during build with all the changes made.'),
    reportRejected: joi.boolean()
      .description('Write a log file in `/public` with the rejected selectors for every file.'),
    ignoreFiles: joi.object({
      webpack: joi.array().items(joi.string())
        .description('Webpack chunck names to ignore while purging CSS.'),
      pages: joi.array().items(joi.string())
        .description('Pages to exclude from optimiztion.'),
      css: joi.array().items(joi.string())
        .description('Webpack chunck names to ignore while purging CSS.'),
      js: joi.array().items(joi.string())
        .description('Webpack chunck names to ignore while purging CSS.')
    }).description('CSS/JavaScript files to ignore during optimization. File names should be relative to `/public` directory'),
    allowSymbols: joi.boolean()
      .description('Sets a custom PurgeCSS extractor that allows CSS selectors to contain symbols (e.g TailwindCSS).'),
    purgecss: joi.object({
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
  })
}
