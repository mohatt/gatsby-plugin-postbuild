import { Promise } from 'bluebird'
import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'
import _ from 'lodash'
import parse5 from 'parse5'
import PurgeCSS from 'purgecss'
import * as htmlparser2 from 'parse5-htmlparser2-tree-adapter'
import filesize from 'filesize'
import { options, reporter } from '../../util'

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

/**
 * Writes the purged asset file on disk
 *
 * @param {string} file - File absolute path
 * @param {string} data - File data
 * @param {([string]|null)} purged - Purged selectors as array to write a rejected
 *  log file next to the main asset file, otherwise nothing will be written
 * @return {Object} - A summary report to be printed
 */
async function writePurged (file, data, purged) {
  // Caclulate data lengths
  const sizes = [
    (await fs.stat(file)).size,
    Buffer.byteLength(data)
  ]
  sizes.push(sizes[1] - sizes[0])
  // Write the actual file
  await fs.writeFile(file, data)
  // Write purged log if enabled
  const rejected = Array.isArray(purged)
  if (rejected) {
    await fs.writeFile(file + '.rejected.log', purged.join(' '))
  }
  const r = {
    file: path.relative(options._public, file),
    sizes: sizes.map(filesize.partial({ spacer: '' })),
    rejected: rejected ? purged.length : undefined
  }

  // Ignore reporting to console if specified
  if (!options.purgecss.reportConsole) {
    return r
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
  return r
}

/**
 * Returns a copy of options with non PurgeCSS options removed
 *
 * @param {Object} options
 * @return {Object}
 */
function getPurgeCssOptions (options) {
  const opts = { ...options };
  ['enabled', 'report', 'reportConsole', 'tailwind'].forEach(key => {
    delete opts[key]
  })
  return opts
}

/**
 * Runs the task on the provided asset files
 *
 * @param {Object} assets
 * @param   {[string]} assets.html - HTML absolute file paths
 * @param   {[string]} assets.css - CSS absolute file paths
 * @param {Object} options - Task options
 */
export async function run ({ assets, options }) {
  if (!options.enabled) {
    return
  }

  const purgeCSS = new PurgeCSS()
  const purgeOptions = getPurgeCssOptions(options)
  // Tailwind requires a special extractor
  if (options.tailwind) {
    purgeOptions.defaultExtractor = content => content.match(/[\w-/:]+(?<!:)/g) || []
  }

  const globalStyles = {}
  const html = Promise.map(assets.html, async filename => {
    const filedata = await fs.readFile(filename, 'utf8')
    const tree = parse5.parse(filedata, {
      treeAdapter: htmlparser2
    })

    // CLone the AST and remove all <style> nodes
    // then serialize it back to HTML
    const nakedTree = _.cloneDeep(tree)
    walk(nakedTree, node => node.name !== 'style')
    const file = {
      path: filename,
      tree,
      nakedHtml: parse5.serialize(nakedTree, { treeAdapter: htmlparser2 }),
      styles: []
    }

    // Purge all css inside <style> tags
    // Ignore global styles under <head>
    let inHead = true
    walk(tree, node => {
      // Ignore all styles defined outside <body>
      if (node.name === 'body') inHead = false
      if (node.name !== 'style') return true
      if (typeof node.children[0] === 'undefined') return true
      const style = { node: node.children[0], global: false }
      if (inHead) {
        style.global = (node.attribs.id || '').trim() || sha1(style.node.data, true)
        globalStyles[style.global] ??= { files: [], cache: null }
        if (globalStyles[style.global].files.indexOf(file) === -1) {
          globalStyles[style.global].files.push(file)
        }
      }
      file.styles.push(style)
      return true
    })
    return file
  })

  const htmlReports = await html.mapSeries(file => {
    const mutate = (node, { css, rejected }) => {
      node.data = css
      return options.rejected ? rejected : null
    }

    return Promise.mapSeries(file.styles, style => {
      if (style.global && globalStyles[style.global].cache !== null) {
        return mutate(style.node, globalStyles[style.global].cache)
      }
      const opts = {
        content: style.global
          ? globalStyles[style.global].files.map(sfile => {
              return { raw: sfile.nakedHtml, extension: 'html' }
            })
          : [{ raw: file.nakedHtml, extension: 'html' }],
        css: [{ raw: style.node.data }],
        ...purgeOptions
      }
      return purgeCSS.purge(opts).then(([result]) => {
        if (style.global) {
          globalStyles[style.global].cache = result
        }
        return mutate(style.node, result)
      })
    }).then(result => {
      const ndata = parse5.serialize(file.tree, { treeAdapter: htmlparser2 })
      return writePurged(
        file.path,
        ndata,
        options.rejected ? result.flat() : null
      ).catch((e) => {
        throw new Error(`Unable to write purged html file "${file.path}": ${e.message}`)
      })
    })
  })

  // Write the full purgecss report
  if (options.report) {
    const reportFile = path.join(options._public, 'purgecss.log.json')
    try {
      await fs.writeFile(reportFile, JSON.stringify(htmlReports, null, 2))
    } catch (e) {
      throw new Error(`Unable to write purgecss report file "${reportFile}"`)
    }
  }

  // Write success message
  if (options.reportConsole) {
    // Adds a margin after the last report output
    console.log('')
  }
  reporter.success(`Done purging ${htmlReports.length} files`)
}
