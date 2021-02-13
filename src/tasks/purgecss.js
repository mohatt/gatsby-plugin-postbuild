import { Promise } from 'bluebird'
import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'
import _ from 'lodash'
import parse5 from 'parse5'
import PurgeCSS from 'purgecss'
import * as htmlparser2 from 'parse5-htmlparser2-tree-adapter'
import filesize from 'filesize'
import { options, reporter } from '../util'

/**
 * Recursively walks over a htmlparser2 node tree invoking a callback
 *  on every node on the tree. If the callback returned false
 *  the node will be removed from the tree.
 *
 *  Note: This function may mutate the node tree
 *
 * @param {(htmlparser2.Node|htmlparser2.ParentNode)} node
 * @param {function} cb
 * @return {boolean} - Return value is used for recursion
 */
function walk (node, cb) {
  if (!node.children) return cb(node)
  if (!cb(node)) return false
  node.children = node.children.filter(childNode => {
    return walk(childNode, cb)
  })
  return true
}

/**
 * Creates a sha1 hash from a string.
 *
 * @param {string} data
 * @param {boolean} base64
 */
function sha1 (data, base64 = false) {
  return crypto.createHash('sha1')
    .update(data, 'utf8')
    .digest(base64 ? 'base64' : 'hex')
}

class HtmlFile {

  path
  tree
  nakedHtml
  styles = []
  scripts = []
  purger
  writer

  constructor (path, purger, writer) {
    this.path = path
    this.purger = purger
    this.writer = writer
  }

  async load() {
    const filedata = await fs.readFile(this.path, 'utf8')
    this.tree = parse5.parse(filedata, {
      treeAdapter: htmlparser2
    })
    // clone the tree and remove all <style> nodes
    const nakedTree = _.cloneDeep(this.tree)
    walk(nakedTree, node => node.name !== 'style')
    // then serialize it back to HTML
    this.nakedHtml = parse5.serialize(nakedTree, {
      treeAdapter: htmlparser2
    })
  }

  loadAssets(){
    let inHead = true
    walk(this.tree, node => {
      if (node.name === 'body') {
        inHead = false
      }
      else if (node.name === 'style') {
        this.addStyle(node, inHead)
      }
      else if (node.name === 'link') {
        const rel = (node.attribs.rel || '').toLowerCase().trim()
        if(rel === 'stylesheet') {
          this.addStyle(node, inHead)
        }
      }
      else if (node.name === 'script') {
        this.addScript(node)
      }
      return true
    })
  }

  addStyle(node, head = false) {
    const style = {
      id: null,
      type: node.name,
      text: null,
      file: null
    }
    if(node.name === 'style') {
      if (node.children.length === 0) return
      style.text = node.children[0]
      style.text.data = style.text.data.trim()
      if(style.text.data === '') {
        return
      }
      if (head) {
        style.id = (node.attribs.id || '').trim() || sha1(style.text.data, true)
        this.purger.linkStyle(style, this)
      }
    } else if(node.name === 'link') {
      style.file = this.resolveHref(node)
      if(!style.file){
        return
      }
      style.id = style.file
      this.purger.linkStyle(style, this)
    }
    this.styles.push(style)
  }

  addScript(node) {
    const filename = this.resolveHref(node, 'src')
    if(!filename){
      return
    }
    const relFilename = path.relative(options._public, filename)
    if(this.purger.shouldIgnoreScript(relFilename)) {
      return
    }
    this.scripts.push(filename)
  }

  resolveHref(node, attrib = 'href') {
    let href = (node.attribs[attrib] || '').trim()
    if(!href || /^\w+:\/\//.test(href)) return false
    const prefix = options._pathPrefix
    if(prefix) {
      if(href.indexOf(prefix) === 0){
        href = href.replace(prefix, '')
      } else if (path.isAbsolute(href)){
        return false
      }
    }

    if(path.isAbsolute(href)){
      return path.join(options._public, href)
    }
    return path.resolve(path.dirname(this.path), href)
  }

  purgeStyles() {
    return Promise.mapSeries(this.styles, style => {
      return this.purger.purge(style, this)
    }).then(result => {
      const ndata = parse5.serialize(this.tree, { treeAdapter: htmlparser2 })
      return this.writer.write(
        this.path,
        ndata,
        options.purgecss.rejected ? result.flat() : null
      )
    })
  }
}

class Purger {

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
        if(this.ignoredScripts.indexOf(file) === -1) {
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

  linkStyle(style, file) {
    this.linkedStyles[style.id] ??= { files: [], cache: null }
    if (this.linkedStyles[style.id].files.indexOf(file) === -1) {
      this.linkedStyles[style.id].files.push(file)
    }
  }

  shouldIgnoreScript(script) {
    return this.ignoredScripts.indexOf(script) !== -1
  }

  async applyStyleChanges(style, result, fromCache = false) {
    const rejected = options.purgecss.rejected
      ? result.rejected
      : null
    if(style.type === 'style') {
      style.text.data = result.css
      return rejected
    }

    if(style.type === 'link' && !fromCache){
      await this.writer.write(style.file, result.css, rejected)
    }
    return []
  }

  async purge(style, file) {
    if (style.id && this.linkedStyles[style.id].cache !== null) {
      return this.applyStyleChanges(style, this.linkedStyles[style.id].cache, true)
    }

    const opts = {
      content: [],
      css: [],
      ...this.purgeOptions
    }

    if(style.type === 'link'){
      try {
        await fs.access(style.file)
        opts.css.push({ raw: await fs.readFile(style.file)})
      } catch (e) {
        return []
      }
    } else {
      opts.css.push({ raw: await style.text.data})
    }

    const files = style.id ? this.linkedStyles[style.id].files : [file]
    for (const sfile of files) {
      opts.content.push({ raw: sfile.nakedHtml, extension: 'html' })
      await Promise.map(sfile.scripts, async script => {
        if(!(script in this.cachedScripts)) {
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

class FileWriter {
  reports = []

  /**
   * Writes the purged asset file on disk
   *
   * @param {string} file - File absolute path
   * @param {string} data - File data
   * @param {([string]|null)} purged - Purged selectors as array to write a rejected
   *  log file next to the main asset file, otherwise nothing will be written
   * @return {Object} - A summary report to be printed
   */
  async write (file, data, purged) {
    let sizes, rejected = Array.isArray(purged)
    try {
      await fs.access(file)
      // Caclulate data lengths
      sizes = [
        (await fs.stat(file)).size,
        Buffer.byteLength(data)
      ]
      sizes.push(sizes[1] - sizes[0])
      // Write the actual file
      await fs.writeFile(file, data)
      // Write purged log if enabled
      if (rejected) {
        await fs.writeFile(file + '.rejected.log', purged.join(' '))
      }
    }
    catch (e) {
      throw new Error(`Unable to write purged file "${file}": ${e.message}`)
    }

    const r = {
      file: path.relative(options._public, file),
      sizes: sizes.map(filesize.partial({ spacer: '' })),
      rejected: rejected ? purged.length : undefined
    }
    this.reports.push(r)
    // Ignore reporting to console if specified
    if (!options.reportConsole) {
      return
    }

    // Write report to console
    console.log(`\x1b[33m
 ${r.file}\x1b[0m\x1b[2m
  |- Size: ${r.sizes[0]} -> ${r.sizes[1]} (${r.sizes[2]})` +
      (rejected
        ? `
  |- Rejected: ${r.rejected} selector${r.rejected !== 1 ? 's' : ''}`
        : '') +
      '\x1b[0m')
  }

  getReports() {
    return this.reports
  }
}

/**
 * Runs task on the provided asset files
 *
 * @param {Object} assets Absolute file paths
 * @param   {[string]} assets.html
 * @param   {[string]} assets.css
 * @param   {[string]} assets.js
 */
export default async function ({ assets }) {
  const writer = new FileWriter()
  const purger = new Purger(writer)
  const html = Promise.map(assets.html, filename => {
    const file = new HtmlFile(filename, purger, writer)
    return file.load().then(() => {
      file.loadAssets()
      return file
    })
  })

  await html.mapSeries(file => {
    return file.purgeStyles()
  })

  // Write the full postbuild report
  const reports = writer.getReports()
  if (options.report) {
    const reportFile = path.join(options._public, 'postbuild.log.json')
    try {
      await fs.writeFile(reportFile, JSON.stringify(reports, null, 2))
    } catch (e) {
      throw new Error(`Unable to write postbuild report file "${reportFile}"`)
    }
  }

  // Write success message
  if (options.reportConsole) {
    // Adds a margin after the last report output
    console.log('')
  }
  reporter.success(`Done purging ${reports.length} files`)
}
