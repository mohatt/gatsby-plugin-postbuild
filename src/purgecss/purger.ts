import { Promise } from 'bluebird'
import { promises as fs } from 'fs'
import { cloneDeep } from 'lodash'
import PurgeCSS from 'purgecss'
import { HtmlFile, IStyle, StyleFile } from './html'
import { createDebug, IOptions, options } from '../util'
import { AssetMapper } from './mapper'
import { PurgeCSSOptions } from '../options'
const debug = createDebug('purgecss/purger')

export interface PurgeResult {
  css: string
  rejected?: string[]
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
    this.purgeOptions = cloneDeep(options.purgecss)
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
   * Applies PurgeCSS changes on the given style object
   */
  async applyStyleChanges (style: IStyle, result: PurgeResult, fromCache = false): Promise<string[]|null> {
    const rejected = result.rejected !== undefined
      ? result.rejected
      : null
    if (style instanceof StyleFile) {
      if (!fromCache) {
        await style.write(result)
      }
      return []
    }

    await style.write(result)
    return rejected
  }

  /**
   * Purges a style object based on its metadata
   */
  async purge (style: IStyle, file: HtmlFile): Promise<string[]|null> {
    if (style.hasID() && style.getID() in this.cachedStyles) {
      debug('Retreiving cached purge result for style', style.getID())
      return await this.applyStyleChanges(style, this.cachedStyles[style.getID()], true)
    }

    const opts: Pick<PurgeCSSOptions, 'content'|'css'> = {
      ...this.purgeOptions,
      content: [],
      css: []
    }

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

    return this.purgeCSS.purge(opts).then(([result]: PurgeResult[]) => {
      if (style.hasID()) {
        debug('Caching purge result on style', style.getID())
        this.cachedStyles[style.getID()] = result
      }
      return this.applyStyleChanges(style, result)
    })
  }
}
