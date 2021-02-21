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
  allowSymbols: boolean
  ignoreFiles: {
    webpack: string[]
    pages: string[]
    css: string[]
    js: string[]
  }
  purgecss: Pick<PurgeCSSOptions, 'defaultExtractor'|'rejected'|'fontFace'|'keyframes'|'variables'|'blocklist'|'safelist'>
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
  ignoreFiles: {
    webpack: ['app', 'polyfill'],
    pages: [],
    css: [],
    js: []
  },
  allowSymbols: false,
  purgecss: {
    ...defaultOptions,
    rejected: true
  }
}

/**
 * Plugin options schema
 */
export function schema (Joi: GatsbyJoi): GatsbyJoi {
  return Joi.object({
    enabled: Joi.boolean()
      .description('Whether to run the purgecss task or not.'),
    report: Joi.boolean()
      .description('Write a "postbuild.log.json" file in "/public" with all the changes made.'),
    reportConsole: Joi.boolean()
      .description('Print a summary report during build with all the changes made.'),
    ignoreFiles: Joi.object({
      webpack: Joi.array().items(Joi.string())
        .description('Webpack chunck names to ignore while purging CSS.'),
      pages: Joi.array().items(Joi.string())
        .description('Pages to exclude from optimiztion.'),
      css: Joi.array().items(Joi.string())
        .description('Webpack chunck names to ignore while purging CSS.'),
      js: Joi.array().items(Joi.string())
        .description('Webpack chunck names to ignore while purging CSS.')
    }).description('CSS/JavaScript files to ignore during optimization. File names should be relative to "/public" directory'),
    allowSymbols: Joi.boolean()
      .description('Sets a custom PurgeCSS extractor that allows CSS selectors to contain symbols (e.g TailwindCSS).'),
    purgecss: Joi.object({
      rejected: Joi.boolean()
        .description('Write a log file in "/public" with the rejected selectors for every file.'),
      defaultExtractor: Joi.function()
        .description('A custom PurgeCSS extractor to be used instead of the default one.'),
      safelist: Joi.alternatives().try(
        Joi.object({}).unknown(true),
        Joi.array().items(Joi.string())
      ).description('Selectors that are safe to leave in the final CSS.'),
      blocklist: Joi.array().items(Joi.string())
        .description('Selectors that are blocked from appearing in the final CSS.'),
      fontFace: Joi.boolean()
        .description('Remove any unused @font-face rules in your css.'),
      keyframes: Joi.boolean()
        .description('Remove any unused @keyframes rules in your css.'),
      variables: Joi.boolean()
        .description('Remove any unused variables in your css.')
    })
  })
}
