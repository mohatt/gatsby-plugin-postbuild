import _ from 'lodash'
import { PLUGIN } from '~/common'
import Link from './link'
import type { Filesystem } from '~/filesystem'
import type { IOptions, IHeadersMap, IHeader } from '../options'

/**
 * Default security headers
 */
const HEADERS_SECURITY = {
  '/*': [
    'X-Frame-Options: DENY',
    'X-XSS-Protection: 1; mode=block',
    'X-Content-Type-Options: nosniff',
    'Referrer-Policy: same-origin'
  ]
}

/**
 * Cache control header for immutable assets
 */
const HEADER_CACHE_IMMUTABLE = 'Cache-Control: public, max-age=31536000, immutable'

/**
 * Default caching headers
 */
const HEADERS_CACHING = {
  '/static/*': [HEADER_CACHE_IMMUTABLE]
}

/**
 * Headers file builder
 */
export default class Builder {
  headers: IHeadersMap
  pages: {
    [path: string]: Link[]
  } = {}

  readonly options: IOptions
  readonly fs: Filesystem
  constructor (options: IOptions, fs: Filesystem) {
    this.options = options
    this.fs = fs
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
      this.headers[link.href] = [HEADER_CACHE_IMMUTABLE]
    }
  }

  /**
   * Adds a Link to a page path
   */
  addPageLink (page: string, link: Link): void {
    (this.pages[page] ||= []).push(link)
  }

  /**
   * Builds the netlify `_headers` file
   */
  build (): Promise<void> {
    /**
     * - When used as an Array.filter(predicate: callback):
     *   - Filters out invalid headers by returning undefined
     *
     * - When used as an _.unionBy([..], predicate: callback):
     *   - Overwrites headers with user-defined headers based on lower-cased
     *      header name (either single or multi entry headers)
     *   - Merges multi-entry 'Link' headers with user-defined ones (either single
     *      or multi entry headers)
     **/
    const hcallback = (h: IHeader): string|number|undefined => {
      const matches = (typeof h === 'string' ? h : h[0] || '').match(/^([^:]+):/)
      const hname = matches?.[1].toLowerCase().trim()
      return hname === 'link' ? Math.random() : hname
    }

    for (const path in this.pages) {
      const links = this.options.transformPathLinks(this.pages[path], path)
      if (!Array.isArray(links)) continue
      this.headers[path] = [
        _.sortBy(links, 'priority')
          .filter(link => link instanceof Link)
          .map(link => `Link: ${String(link)}`)
      ]
      if ('[page]' in this.options.headers) {
        this.headers[path] = _.unionBy(this.options.headers['[page]'], this.headers[path], hcallback)
      }
    }

    for (const path in this.options.headers) {
      if (path === '[page]') continue
      const headers = this.options.headers[path].filter(hcallback)
      if (path in this.headers) {
        this.headers[path] = _.unionBy(headers, this.headers[path], hcallback)
        continue
      }
      this.headers[path] = headers
    }

    const lines = [`## Created with ${PLUGIN}`, '']
    for (const path in this.headers) {
      lines.push(path)
      this.headers[path].flat().forEach(h => lines.push('  ' + h))
    }

    // Write _headers file
    return this.fs.create('_headers', lines.join('\n'))
  }
}
