import type { MinifyOptions as TerserOptions } from 'terser'
import type { ITaskApiOptions, ITaskOptions } from '@postbuild'

/**
 * Task options interface
 */
export interface IMinifyTaskOptions extends ITaskOptions {
  script: TerserOptions | boolean
  style: [string, object] | object | Function | boolean
}

/**
 * Options API exports
 */
export const options: ITaskApiOptions<IMinifyTaskOptions> = {
  defaults: {
    enabled: false,
    ignore: [],
    script: {},
    style: ['default', {}],
  },
  schema: (joi) => {
    return joi.object({
      script: joi
        .alternatives()
        .try(joi.boolean(), joi.object().unknown(true))
        .description('Options passed to javascript minifier.'),
      style: joi
        .alternatives()
        .try(
          joi.boolean(),
          joi.object(),
          joi.array().items(joi.string(), joi.object().unknown(true)),
          joi.function().maxArity(0),
        )
        .description('Options passed to css minifier.'),
    })
  },
}

declare module 'gatsby-plugin-postbuild' {
  interface IOptions {
    minify: IMinifyTaskOptions
  }
}
