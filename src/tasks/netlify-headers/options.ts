import type { ITaskApiOptions, ITaskOptions } from '~/tasks'
import type Link from './lib/link'

/**
 * Either a string for single-entry headers or
 *  an array of strings for multi-entry headers
 *
 *  Example of a single-entry header:
 *   'Cache-Control: public, max-age=31536000, immutable'
 *
 *  Examples of a multi-entry header:
 *   [
 *    'Cache-Control: public',
 *    'Cache-Control: max-age=31536000',
 *    'Cache-Control: immutable'
 *   ]
 *   or
 *   [
 *    'Link: </script.js>; rel=preload; as=script',
 *    'Link: </image.png>; rel=preload; as=image'
 *   ]
 */
export type IHeader = string|string[]

/**
 * Map of paths to path headers
 */
export interface IHeadersMap {
  [path: string]: IHeader[]
}

/**
 * Task options interface
 */
export type IOptions = ITaskOptions & {
  headers: IHeadersMap
  security: boolean
  caching: boolean
  cachingAssetTypes: string[]
  transformPathLinks: (links: Link[], path: string) => Link[]
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
    transformPathLinks: links => links,
    removeLinkTags: true
  },
  schema: (joi) => {
    return joi.object({
      headers: joi.object()
        .pattern(
          joi.string(),
          joi.array().items(
            joi.alternatives().try(
              joi.string(),
              joi.array().items(joi.string())
            )
          )
        )
        .description('Headers to merge with the generated headers.'),
      security: joi.boolean()
        .description('Adds useful security headers to all paths.'),
      caching: joi.boolean()
        .description('Adds useful caching headers to immutable asset paths.'),
      cachingAssetTypes: joi.array()
        .items(joi.string())
        .description('Specifies the types of assets that are considered immutable.'),
      transformPathLinks: joi.function().maxArity(2)
        .description('Callback for manipulating links under each path.'),
      removeLinkTags: joi.boolean()
        .description('Removes the HTML link tags processed by the task.')
    })
  }
}
