import _ from 'lodash'
import Link from './link'
import Provider from './providers'
import type { Filesystem } from '@postbuild'
import type { IOptions, IHeadersMap, IPathHeadersMap } from '../options'

export enum PathPlaceholder {
  All = '[*]',
  Pages = '[pages]',
  PageData = '[page-data]',
  Static = '[static]',
  Assets = '[assets]'
}

/**
 * Cache control headers
 */
const HEADER_CACHE_IMMUTABLE = 'public, max-age=31536000, immutable'
const HEADER_CACHE_NEVER = 'public, max-age=0, must-revalidate'

/**
 * Default security headers
 */
const HEADERS_SECURITY: IPathHeadersMap = {
  [PathPlaceholder.All]: {
    'x-frame-options': 'DENY',
    'x-xss-protection': '1; mode=block',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'same-origin'
  }
}

/**
 * Default caching headers
 */
const HEADERS_CACHING: IPathHeadersMap = {
  [PathPlaceholder.Pages]: {
    'cache-control': HEADER_CACHE_NEVER
  },
  [PathPlaceholder.PageData]: {
    'cache-control': HEADER_CACHE_NEVER
  },
  [PathPlaceholder.Static]: {
    'cache-control': HEADER_CACHE_IMMUTABLE
  },
  [PathPlaceholder.Assets]: {
    'cache-control': HEADER_CACHE_IMMUTABLE
  }
}

/**
 * Headers file builder
 */
export default class Builder {
  headers: IPathHeadersMap
  cachedAssets: string[] = []
  pages: {
    [path: string]: Link[]
  } = {}

  readonly provider: Provider
  readonly options: IOptions
  readonly fs: Filesystem
  readonly pathPrefix: string
  constructor (options: IOptions, fs: Filesystem, pathPrefix: string) {
    this.provider = Provider.factory(options, fs)
    this.options = options
    this.fs = fs
    this.pathPrefix = pathPrefix
    this.headers = {
      ...(options.security ? HEADERS_SECURITY : {}),
      ...(options.caching ? HEADERS_CACHING : {})
    }
  }

  /**
   * Adds a Link's href path as an immutable cached asset if
   *  it matches certain critiria
   */
  addCachedAsset (link: Link): void {
    if (
      !this.options.caching ||
      this.options.cachingAssetTypes.length === 0 ||
      link.type !== 'preload' ||
      link.href.indexOf('/page-data/') === 0 ||
      link.href.indexOf('/static/') === 0
    ) return
    if (this.options.cachingAssetTypes.includes(link.attrs.as)) {
      this.cachedAssets.push(link.href)
    }
  }

  /**
   * Adds a Link to a page path
   */
  addPageLink (page: string, link: Link): void {
    (this.pages[page] ||= []).push(link)
  }

  /**
   * Strips gatsby's pathPrefix from a given href
   */
  normalizeHref (href: string): string {
    return href.indexOf(this.pathPrefix) === 0
      ? href.replace(this.pathPrefix, '') || '/'
      : href
  }

  protected isPathPlaceholder (path: string): path is PathPlaceholder {
    return /^\[[^\]]+]$/.test(path)
  }

  protected getUserHeaders (): IPathHeadersMap {
    const placeholders = Object.values(PathPlaceholder)
    const multiValueHeaders = ['link']

    const source = this.options.headers
    const dest: IPathHeadersMap = {}
    for (const path in source) {
      if (this.isPathPlaceholder(path) && !placeholders.includes(path)) {
        throw new Error(
          `Invalid path placeholder "${path}". ` +
          `Available placeholders are: ${placeholders.join(', ')}`
        )
      }

      dest[path] = {}
      for (const key in source[path]) {
        const name = key.toLowerCase()
        if (name in dest[path]) {
          throw new Error(`Header name "${name}" cannot be defined twice`)
        }
        const value = source[path][key]
        if (Array.isArray(value) && !multiValueHeaders.includes(name)) {
          throw new TypeError(
            `Value for Header name "${name}" must be a string. ` +
            `Headers with multi-value support are: ${multiValueHeaders.join(', ')}`
          )
        }
        dest[path][name] = value
      }
    }

    return dest
  }

  protected mergeHeaders (dest: IHeadersMap, source?: IHeadersMap): IHeadersMap {
    for (const name in source) {
      const value = source[name]
      if (name in dest && Array.isArray(value) && Array.isArray(dest[name])) {
        dest[name] = value.concat(dest[name])
        continue
      }
      dest[name] = value
    }
    return dest
  }

  /**
   * Builds the headers file
   */
  build (): Promise<void> {
    const userHeaders = this.getUserHeaders()
    for (const path in userHeaders) {
      if (path in this.headers) {
        this.mergeHeaders(this.headers[path], userHeaders[path])
        continue
      }
      this.headers[path] = userHeaders[path]
    }

    if (this.options.caching && this.cachedAssets.length) {
      for (const asset of this.cachedAssets) {
        this.headers[asset] = this.mergeHeaders({
          ...this.headers[PathPlaceholder.Assets]
        }, this.headers[asset])
      }
    }

    for (const path in this.pages) {
      // @todo: Validate the return value of a user-defined callback
      const links = this.options.transformPathLinks(this.pages[path], path)
      const pathHeaders = {
        link: _.sortBy(links, 'priority').map(link => String(link))
      }
      this.mergeHeaders(pathHeaders, this.headers[PathPlaceholder.Pages])
      this.headers[path] = this.mergeHeaders(pathHeaders, this.headers[path])
    }

    const headers: IPathHeadersMap = {}
    const omitPlaceholders = [PathPlaceholder.Pages, PathPlaceholder.Assets]
    for (const path in this.headers) {
      if (omitPlaceholders.includes(path as PathPlaceholder)) {
        continue
      }
      headers[this.provider.processPath(path)] = this.headers[path]
    }

    const filename = this.provider.getFilename()
    return this.provider.build(headers)
      .then(data => this.fs.create(filename, data))
      .catch(e => {
        throw new Error(`Unable to write headers file "${filename}": ${String(e.message)}`)
      })
  }
}
