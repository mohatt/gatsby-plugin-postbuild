import type { ITaskApiOptions, ITaskOptions } from '~/tasks'

/**
 * Task options interface
 */
export type IOptions = ITaskOptions & {
  headers: {
    [path: string]: string[]
  }
  security: boolean
  caching: boolean
  cachingAssetTypes: string[]
  removeLinkTags: boolean
}

/**
 * Options API exports
 */
export const options: ITaskApiOptions<IOptions> = {
  defaults: {
    enabled: true,
    ignore: [],
    headers: {},
    security: true,
    caching: true,
    cachingAssetTypes: ['image', 'script', 'style', 'font'],
    removeLinkTags: true
  },
  // @todo write desc
  schema: (joi) => {
    return joi.object({
      headers: joi.object()
        .pattern(joi.string(), joi.array().items(joi.string()))
        .description('@todo'),
      security: joi.boolean()
        .description('@todo'),
      caching: joi.boolean()
        .description('@todo'),
      cachingAssetTypes: joi.array()
        .items(joi.string())
        .description('@todo'),
      removeLinkTags: joi.boolean()
        .description('@todo')
    })
  }
}
