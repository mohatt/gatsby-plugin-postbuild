import { Promise } from 'bluebird'
import _ from 'lodash'
import PurgeCSS from 'purgecss'
import { createDebug } from '~/common'
import { Filesystem } from '~/filesystem'
import { AssetMapper } from './mapper'
import { HtmlTransformer, HtmlStyle, HtmlStyleFile } from './html'
import { IPurgecssOptions, PurgecssLibOptions, purgecssImportedOptions } from '../options'
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
  cachedStyles: {
    [id: string]: IPurgeResult
  } = {}

  /**
   * Cached contents of script files
   * @type {Object}
   */
  cachedScripts: {
    [id: string]: string
  } = {}

  /**
   * PurgeCSS deps
   */
  purgeCSS: PurgeCSS
  purgeOptions: PurgecssLibOptions

  private readonly options: IPurgecssOptions
  private readonly fs: Filesystem
  private readonly mapper

  /**
   * Sets PurgeCSS options
   */
  constructor (options: IPurgecssOptions, fs: Filesystem, mapper: AssetMapper) {
    this.options = options
    this.fs = fs
    this.mapper = mapper
    this.purgeCSS = new PurgeCSS()
    this.purgeOptions = {
      ..._.pick(options, purgecssImportedOptions),
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
  async purge (style: HtmlStyle, file: HtmlTransformer): Promise<string[]> {
    if (style.hasID() && style.getID() in this.cachedStyles) {
      if (style instanceof HtmlStyleFile) {
        debug('Ignoring rewriting file', style.getID())
        return []
      }
      debug('Retreiving cached purge result for style', style.getID())
      const cache = this.cachedStyles[style.getID()]
      await style.update(cache)
      return cache.rejected
    }

    const opts = this.purgeOptions
    opts.content = []
    opts.css = []
    try {
      opts.css.push({ raw: await style.read() })
    } catch (e) {
      if (style instanceof HtmlStyleFile) return []
      throw e
    }

    const files = style.hasID() ? this.mapper.getStyleLinks(style.getID()) : [file]
    for (const sfile of files) {
      opts.content.push({ raw: sfile.html, extension: 'html' })
      await Promise.map(sfile.scripts, async script => {
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
      if (style.hasID()) {
        debug('Caching purge result on style', style.getID())
        this.cachedStyles[style.getID()] = result
      }
      return (style instanceof HtmlStyleFile) ? [] : result.rejected
    })
  }
}
