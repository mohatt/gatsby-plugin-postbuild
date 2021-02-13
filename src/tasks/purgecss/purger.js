import { Promise } from 'bluebird'
import { promises as fs } from 'fs'
import path from 'path'
import PurgeCSS from 'purgecss'
import { options } from '../../util'

export class Purger {
  linkedStyles = {}
  ignoredScripts = []
  cachedScripts = {}
  purgeCSS
  purgeOptions
  writer

  constructor (writer) {
    const ignoredChunks = ['app', 'polyfill']
    const chunks = require(path.join(options._public, 'webpack.stats.json')).assetsByChunkName
    ignoredChunks.forEach(chunk => {
      chunks[chunk].forEach(file => {
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
  }

  linkStyle (style, file) {
    this.linkedStyles[style.id] ??= { files: [], cache: null }
    if (this.linkedStyles[style.id].files.indexOf(file) === -1) {
      this.linkedStyles[style.id].files.push(file)
    }
  }

  shouldIgnoreScript (script) {
    return this.ignoredScripts.indexOf(script) !== -1
  }

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

  async purge (style, file) {
    if (style.id && this.linkedStyles[style.id].cache !== null) {
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
        this.linkedStyles[style.id].cache = result
      }
      return this.applyStyleChanges(style, result)
    })
  }
}
