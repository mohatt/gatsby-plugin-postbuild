import { Promise } from 'bluebird'
import _ from 'lodash'
import { PurgeCSS } from 'purgecss'
import { createDebug } from '@postbuild/common'
import { HtmlContext, Style, StyleFile } from './context'
import { IOptions, PurgecssOptions, purgecssImportedOptions } from '../options'
import type { Filesystem } from '@postbuild'
import type AssetMapper from './mapper'
const debug = createDebug('purgecss/purger')

export interface IPurgeResult {
  css: string
  rejected: string[]
}

/**
 * Handles purges css files and inline styles
 */
export class Purger {
  /**
   * Cache repository for styles shared between
   * multiple html files
   * @type {Object}
   */
  private cachedStyles: {
    [id: string]: IPurgeResult
  } = {}

  /**
   * Cached contents of script files
   * @type {Object}
   */
  private cachedScripts: {
    [id: string]: string
  } = {}

  /**
   * PurgeCSS deps
   */
  private readonly purgeCSS: PurgeCSS
  private readonly purgeOptions: PurgecssOptions

  private readonly options: IOptions
  private readonly fs: Filesystem
  private readonly mapper: AssetMapper

  /**
   * Sets PurgeCSS options
   */
  constructor (options: IOptions, fs: Filesystem, mapper: AssetMapper) {
    this.options = options
    this.fs = fs
    this.mapper = mapper
    this.purgeCSS = new PurgeCSS()
    this.purgeOptions = {
      ..._.pick(options, purgecssImportedOptions),
      content: [],
      css: [],
      rejected: true
    }
    if (options.allowSymbols) {
      this.purgeOptions.defaultExtractor = (content: string) => {
        const matchs = content.match(/[\w-/:]+(?<!:)/g)
        if (matchs !== null) return matchs
        return []
      }
    }
    debug('Purger initialized with purgeOptions', this.purgeOptions)
  }

  /**
   * Purges a style object based on its metadata
   */
  async purge (style: Style, context: HtmlContext): Promise<string[]> {
    const { id } = style
    if (id in this.cachedStyles) {
      if (style instanceof StyleFile) {
        debug('Ignoring rewriting file', id)
        return []
      }
      debug('Retreiving cached purge result for style', id)
      const cache = this.cachedStyles[id]
      await style.update(cache)
      return cache.rejected
    }

    const opts = { ...this.purgeOptions }
    opts.content = []
    opts.css = []
    try {
      opts.css.push({ raw: await style.read() })
    } catch (e) {
      if (style instanceof StyleFile) return []
      throw e
    }

    const contexts = id ? this.mapper.getStyleContexts(style) : [context]
    for (const ctx of contexts) {
      opts.content.push({ raw: ctx.html, extension: 'html' })
      await Promise.map(ctx.scripts, async script => {
        if (!(script in this.cachedScripts)) {
          try {
            this.cachedScripts[script] = await this.fs.read(script)
          } catch (e) {
            return
          }
        }
        opts.content.push({ raw: this.cachedScripts[script], extension: 'js' })
      })
    }

    return this.purgeCSS.purge(opts).then(async results => {
      const result = results[0] as IPurgeResult
      await style.update(result)
      if (id) {
        debug('Caching purge result on style', id)
        this.cachedStyles[id] = result
      }
      return (style instanceof StyleFile) ? [] : result.rejected
    })
  }
}

export default Purger
