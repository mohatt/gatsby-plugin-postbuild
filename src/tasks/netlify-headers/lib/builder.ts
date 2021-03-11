import { PLUGIN } from '~/common'
import type { Filesystem } from '~/filesystem'
import type { IOptions } from '../options'
import type Link from './link'

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
  headers: {
    [path: string]: string[]
  }

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
      ...(options.caching ? HEADERS_CACHING : {}),
      ...this.options.headers
    }
  }

  addCachedAsset (link: Link): void {
    if (
      !this.options.caching ||
      this.options.cachingAssetTypes.length === 0 ||
      /^\w+:\/\//.test(link.href) ||
      link.type !== 'preload' ||
      link.href.indexOf('/page-data/') === 0 ||
      link.href.indexOf('/static/') === 0
    ) return
    if (this.options.cachingAssetTypes.includes(link.meta.as)) {
      this.headers[link.href] = [HEADER_CACHE_IMMUTABLE]
    }
  }

  addPageLink (page: string, link: Link): void {
    (this.pages[page] ||= []).push(link)
  }

  build (): Promise<void> {
    for (const path in this.pages) {
      if (this.headers[path] === undefined) {
        this.headers[path] = this.pages[path].map(link => `Link: ${String(link)}`)
      }
    }
    const lines = [
      `## Created with ${PLUGIN}`,
      ''
    ]
    for (const path in this.headers) {
      lines.push(path)
      this.headers[path].forEach(h => lines.push('  ' + h))
    }

    // Write _headers file
    return this.fs.create('_headers', lines.join('\n'))
  }
}
