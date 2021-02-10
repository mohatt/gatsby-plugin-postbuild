export const defaults = {
  // Options consumend by the task
  enabled: true,
  report: true,
  reportConsole: true,
  tailwind: false,
  // Options consumend by both the task and PurgeCSS
  rejected: true
  // Options consumend by PurgeCss
  // We leave that to PurgeCss
}

export function schema (Joi) {
  return Joi.object({
    enabled: Joi.boolean()
      .description('Whether to run the purgecss task or not.'),
    report: Joi.boolean()
      .description('Write a "purgecss.log.json" file in "public" with all the changes made.'),
    reportConsole: Joi.boolean()
      .description('Print a summary report during build with all the changes made.'),
    tailwind: Joi.boolean()
      .description('Use custom extractor for tailwind.'),
    rejected: Joi.boolean()
      .description('Write a log file in "public" with the rejected selectors for every file.'),
    defaultExtractor: Joi.function()
      .description('A custom PurgeCSS extractor to be used instead of the default one.'),
    extractors: Joi.array().items(Joi.object({}).unknown(true))
      .description('A list of custom PurgeCSS extractors to be used for certain file types.'),
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
}
