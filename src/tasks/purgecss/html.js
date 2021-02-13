import { Promise } from 'bluebird'
import { promises as fs } from 'fs'
import path from 'path'
import parse5 from 'parse5'
import * as htmlparser2 from 'parse5-htmlparser2-tree-adapter'
import _ from 'lodash'
import { options, sha1 } from '../../util'

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

export class HtmlFile {

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
