import { Promise } from 'bluebird'
import { promises as fs } from 'fs'
import path from 'path'
import _ from 'lodash'
import PurgeCSS from 'purgecss'
import { createDebug, options } from '../../util'
const debug = createDebug('purgecss/purger')

/**
 * Handles purges css files and inline styles
 */
export class Purger {
  /**
   * Styles shared between multiple html files
   * @type {Object}
   */
  linkedStyles = {}

  /**
   * Script files that should be ignored
   * @type {[string]}
   */
  ignoredScripts = []

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
   * @type {FileWriter}
   */
  writer

  /**
   * Sets ignored scripts and PurgeCSS options
   *
   * @constructor
   * @param {FileWriter} writer
   */
  constructor (writer) {
    const ignoredChunks = ['app', 'polyfill']
    const chunks = require(path.join(options._public, 'webpack.stats.json')).assetsByChunkName
    ignoredChunks.forEach(chunk => {
      chunks[chunk].forEach(file => {
        file = path.join(options._public, file)
        if (this.ignoredScripts.indexOf(file) === -1) {
          this.ignoredScripts.push(file)
        }
      })
    })
    this.purgeCSS = new PurgeCSS()
    this.purgeOptions = { ...options.purgecss }
    if (this.purgeOptions.allowSymbols) {
      delete this.purgeOptions.allowSymbols
      this.purgeOptions.defaultExtractor = content => content.match(/[\w-/:]+(?<!:)/g) || []
    }
    this.writer = writer
    debug('Purger initialized with', _.pick(this, ['ignoredScripts', 'purgeOptions']))
  }

  /**
   * Links a given style to a html file
   *
   * @param {Object} style
   * @param {HtmlFile} file
   */
  linkStyle (style, file) {
    this.linkedStyles[style.id] ??= { files: [], cache: null }
    if (this.linkedStyles[style.id].files.indexOf(file) === -1) {
      this.linkedStyles[style.id].files.push(file)
      debug('Linked style with file', [style.id, file.path])
    }
  }

  /**
   * Decides whether to ignore a script file or not
   *
   * @param {string} script
   * @return {boolean}
   */
  shouldIgnoreScript (script) {
    return this.ignoredScripts.indexOf(script) !== -1
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
    if (style.id && this.linkedStyles[style.id].cache !== null) {
      debug('Retreiving cached purge result for style', style.id)
      return this.applyStyleChanges(style, this.linkedStyles[style.id].cache, true)
    }

    const opts = {
      content: [],
      css: [],
      ...this.purgeOptions
    }
    if (style.type === 'link') {
      try {
        await fs.access(style.file)
        opts.css.push({ raw: await fs.readFile(style.file) })
      } catch (e) {
        return []
      }
    } else {
      opts.css.push({ raw: await style.text.data })
    }

    const files = style.id ? this.linkedStyles[style.id].files : [file]
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
        this.linkedStyles[style.id].cache = result
      }
      return this.applyStyleChanges(style, result)
    })
  }
}
