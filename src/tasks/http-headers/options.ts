import type { ITaskApiOptions, ITaskOptions } from '@postbuild'
import { ProviderSymbol } from './lib/providers'
import type Link from './lib/link'

/**
 * Header value is either a string for single-value headers or
 *  an array of strings for multi-value headers
 *
 *  Example of a single-value header:
 *   {
 *     'cache-control': 'public, max-age=31536000, immutable'
 *   }
 *
 *  Examples of a multi-value header:
 *   {
 *    'link': [
 *      '</script.js>; rel=preload; as=script',
 *      '</image.png>; rel=preload; as=image'
 *    ]
 *   }
 */
export interface IHeadersMap {
  [name: string]: string|string[]
}

/**
 * Map of paths to path headers
 */
export interface IPathHeadersMap {
  [path: string]: IHeadersMap
}

/**
 * Task options interface
 */
export type IOptions = ITaskOptions & {
  provider: ProviderSymbol
  headers: IPathHeadersMap
  security: boolean
  caching: boolean
  transformPathLinks: (links: Link[], path: string) => Link[]
  removeLinkTags: boolean
}

/**
 * Options API exports
 */
export const options: ITaskApiOptions<IOptions> = {
  defaults: {
    enabled: false,
    ignore: [],
    provider: ProviderSymbol.Netlify,
    headers: {},
    security: true,
    caching: true,
    transformPathLinks: links => links,
    removeLinkTags: true
  },
  schema: (joi) => {
    const nonEmptyString = joi.string().trim().required()
    return joi.object({
      provider: joi.string().valid(...Object.values(ProviderSymbol))
        .description('Headers file provider.'),
      headers: joi.object()
        .pattern(
          nonEmptyString,
          joi.object().pattern(
            joi.string().pattern(/^[\w-]+$/),
            joi.alternatives().try(
              nonEmptyString,
              joi.array().items(nonEmptyString)
            )
          )
        )
        .description('Headers to merge with the generated headers.'),
      security: joi.boolean()
        .description('Adds useful security headers.'),
      caching: joi.boolean()
        .description('Adds useful caching headers to immutable asset paths.'),
      transformPathLinks: joi.function().maxArity(2)
        .description('Callback for manipulating links under each path.'),
      removeLinkTags: joi.boolean()
        .description('Removes the HTML link tags processed by the task.')
    })
  }
}

export default IOptions
