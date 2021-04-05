import type { ITaskApiOptions, ITaskOptions } from '@postbuild'

/**
 * Task options interface
 */
export type IOptions = ITaskOptions & {
  script: object | boolean
  style: [string, object] | object | Function | boolean
}

/**
 * Options API exports
 */
export const options: ITaskApiOptions<IOptions> = {
  defaults: {
    enabled: false,
    ignore: [],
    script: {},
    style: ['default', {}]
  },
  schema: (joi) => {
    return joi.object({
      script: joi
        .alternatives().try(joi.boolean(), joi.object().unknown(true))
        .description('Options passed to javascript minifier.'),
      style: joi
        .alternatives().try(
          joi.boolean(),
          joi.object(),
          joi.array().items(joi.string(), joi.object().unknown(true)),
          joi.function().maxArity(0)
        )
        .description('Options passed to css minifier.')
    })
  }
}

export default IOptions
