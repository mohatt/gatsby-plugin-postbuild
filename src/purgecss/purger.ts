import { Promise } from 'bluebird'
import { promises as fs } from 'fs'
import PurgeCSS from 'purgecss'
import { HtmlFile, IStyle, StyleFile } from './html'
import { createDebug, IOptions, options } from '../util'
import { AssetMapper } from './mapper'
const debug = createDebug('purgecss/purger')

export interface PurgeResult {
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
    [id: string]: PurgeResult
  } = {}

  /**
   * Cached contents of script files
   * @type {Object}
   */
  cachedScripts: {
    [id: string]: string
  } = {}

  /**
   * @type PurgeCSS
   */
  purgeCSS

  /**
   * Options to pass to PurgeCSS
   */
  purgeOptions: IOptions['purgecss']

  private readonly mapper

  /**
   * Sets PurgeCSS options
   */
  constructor (mapper: AssetMapper) {
    this.purgeCSS = new PurgeCSS()
    this.purgeOptions = {
      ...options.purgecss,
      rejected: true
    }
    if (options.allowSymbols) {
      this.purgeOptions.defaultExtractor = content => {
        const matchs = content.match(/[\w-/:]+(?<!:)/g)
        if (matchs !== null) return matchs
        return []
      }
    }
    this.mapper = mapper
    debug('Purger initialized with purgeOptions', this.purgeOptions)
  }

  /**
   * Purges a style object based on its metadata
   */
  async purge (style: IStyle, file: HtmlFile): Promise<string[]> {
    if (style.hasID() && style.getID() in this.cachedStyles) {
      if (style instanceof StyleFile) {
        debug('Ignoring rewriting file', style.getID())
        return []
      }
      debug('Retreiving cached purge result for style', style.getID())
      const cache = this.cachedStyles[style.getID()]
      await style.write(cache)
      return cache.rejected
    }

    const opts = this.purgeOptions
    opts.content = []
    opts.css = []
    try {
      opts.css.push({ raw: await style.read() })
    } catch (e) {
      if (style instanceof StyleFile) return []
      throw e
    }

    const files = style.hasID() ? this.mapper.getStyleLinks(style.getID()) : [file]
    for (const sfile of files) {
      opts.content.push({ raw: sfile.nakedHtml, extension: 'html' })
      await Promise.map(sfile.scripts, async script => {
        if (!(script in this.cachedScripts)) {
          try {
            await fs.access(script)
            this.cachedScripts[script] = await fs.readFile(script, 'utf8')
          } catch (e) {
            return
          }
        }
        opts.content.push({ raw: this.cachedScripts[script], extension: 'js' })
      })
    }

    return this.purgeCSS.purge(opts).then(async results => {
      const result = results[0] as PurgeResult
      await style.write(result)
      if (style.hasID()) {
        debug('Caching purge result on style', style.getID())
        this.cachedStyles[style.getID()] = result
      }
      return (style instanceof StyleFile) ? [] : result.rejected
    })
  }
}
