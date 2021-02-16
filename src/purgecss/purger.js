import { Promise } from 'bluebird'
import { promises as fs } from 'fs'
import PurgeCSS from 'purgecss'
import { createDebug, options } from '../util'
const debug = createDebug('purgecss/purger')

/**
 * Handles purges css files and inline styles
 */
export class Purger {
  /**
   * Cache repository for styles shared between
   * multiple html files
   * @type {Object}
   */
  cachedStyles = {}

  /**
   * Cached contents of script files
   * @type {Object}
   */
  cachedScripts = {}

  /**
   * @type PurgeCSS
   */
  purgeCSS

  /**
   * Options to pass to PurgeCSS
   * @type {Object}
   */
  purgeOptions

  /**
   * @type {AssetMapper}
   */
  mapper

  /**
   * @type {FileWriter}
   */
  writer

  /**
   * Sets PurgeCSS options
   *
   * @constructor
   * @param {AssetMapper} mapper
   * @param {FileWriter} writer
   */
  constructor (mapper, writer) {
    this.purgeCSS = new PurgeCSS()
    this.purgeOptions = { ...options.purgecss }
    if (options.allowSymbols) {
      this.purgeOptions.defaultExtractor = content => content.match(/[\w-/:]+(?<!:)/g) || []
    }
    this.mapper = mapper
    this.writer = writer
    debug('Purger initialized with purgeOptions', this.purgeOptions)
  }

  /**
   * Applies PurgeCSS changes to the given style object
   *
   * @param {Object} style
   * @param {Object} result
   * @param {boolean} fromCache
   * @return {Promise<string[]|null>}
   */
  async applyStyleChanges (style, result, fromCache = false) {
    const rejected = options.purgecss.rejected
      ? result.rejected
      : null
    if (style.type === 'style') {
      style.text.data = result.css
      return rejected
    }

    if (style.type === 'link' && !fromCache) {
      await this.writer.write(style.file, result.css, rejected)
    }
    return []
  }

  /**
   * Purges a style object based on its metadata
   *
   * @param {Object} style
   * @param {HtmlFile} file
   * @return {(Promise<string[]|null>|string[]|null)}
   */
  async purge (style, file) {
    if (style.id && style.id in this.cachedStyles) {
      debug('Retreiving cached purge result for style', style.id)
      return this.applyStyleChanges(style, this.cachedStyles[style.id], true)
    }

    const opts = {
      content: [],
      css: [],
      ...this.purgeOptions
    }
    if (style.type === 'link') {
      try {
        await fs.access(style.file)
        opts.css.push({ raw: await fs.readFile(style.file, 'utf-8') })
      } catch (e) {
        return []
      }
    } else {
      opts.css.push({ raw: style.text.data })
    }

    const files = style.id ? this.mapper.getStyleLinks(style.id) : [file]
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

    return this.purgeCSS.purge(opts).then(([result]) => {
      if (style.id) {
        debug('Caching purge result on style', style.id)
        this.cachedStyles[style.id] = result
      }
      return this.applyStyleChanges(style, result)
    })
  }
}
