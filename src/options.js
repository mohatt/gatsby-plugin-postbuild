export const defaults = {
  enabled: true,
  report: true,
  reportConsole: true,
  allowSymbols: false,
  purgecss: {
    rejected: true,
    fontFace: false,
    keyframes: false,
    variables: false
  }
}

export function schema (Joi) {
  return Joi.object({
    enabled: Joi.boolean()
      .description('Whether to run the purgecss task or not.'),
    report: Joi.boolean()
      .description('Write a "postbuild.log.json" file in "/public" with all the changes made.'),
    reportConsole: Joi.boolean()
      .description('Print a summary report during build with all the changes made.'),
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
