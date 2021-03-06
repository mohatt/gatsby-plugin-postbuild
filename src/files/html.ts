import { Promise } from 'bluebird'
import path from 'path'
import * as parse5 from 'parse5'
import parse5Adaptor from 'parse5/lib/tree-adapters/default'
import { File } from './base'

/**
 * A callback function to be run on tree nodes
 * @see FileHtml.walk
 */
export type IFileHtmlNodeWalker = (node: parse5.Node) => Promise<void>|void

/**
 * Interface for html files
 */
export class FileHtml extends File<FileHtml> {
  /**
   * Parse5 tree adaptor
   */
  adaptor: typeof parse5Adaptor = parse5Adaptor

  /**
   * Compiled ast tree
   */
  tree: parse5.Document = this.adaptor.createDocument()

  /**
   * Reads the file then compiles its html to ast
   */
  read (): Promise<void> {
    return this.doRead()
      .then(html => this.emit('html', 'parse', {
        ...this.payload,
        html
      }, 'html'))
      .then(html => {
        this.tree = parse5.parse(html)
        return this.emit('html', 'tree', this.payload)
      }) as Promise<void>
  }

  /**
   * Invokes html.node events on all nodes
   */
  process (): Promise<void> {
    return this.walk(node => {
      return this.emit('html', 'node', {
        ...this.payload,
        node
      }) as unknown as Promise<void>
    })
  }

  /**
   * Serializes the tree back to html and writes the file
   */
  write (): Promise<void> {
    return this.emit('html', 'serialize', this.payload)
      .then(() => {
        const html = parse5.serialize(this.tree)
        return this.emit('html', 'write', {
          ...this.payload,
          html
        }, 'html')
      })
      .then(html => this.doUpdate(html))
  }

  /**
   * Recursively walks through a parse5 tree invoking a callback
   *  on every node on the tree.
   */
  async walk (cb: IFileHtmlNodeWalker, node: parse5.Node = this.tree): Promise<void> {
    await cb(node)
    if ('childNodes' in node) {
      await Promise.each(node.childNodes, childNode => {
        return this.walk(cb, childNode)
      })
    }
  }

  /**
   * Resolves a href attribute of a given node into local file path
   *
   * @param node - Parse5 element node
   * @param attrib - Target attribute. Defaults to `href`
   * @param relative - Return path relative to `/public`. Defaults to `true`
   * @param strict - Return false if resolved path is outside `/public`. Defaults to `true`
   * @return Resolved file path or false on failure to meet conditions
   */
  resolveHref (node: parse5.Element, attrib = 'href', relative = true, strict = true): string|boolean {
    const attr = node.attrs.find(a => a.name === attrib)
    if (attr === undefined) return false
    let href = attr.value.trim()
    if (href === '' || /^\w+:\/\//.test(href)) return false
    const prefix = this.fs.pathPrefix
    if (prefix !== '') {
      if (href.indexOf(prefix) === 0) {
        href = href.replace(prefix, '')
      // absolute path oustide gatsby root
      } else if (path.isAbsolute(href)) {
        return false
      }
    }

    const absPath = path.isAbsolute(href)
      ? path.join(this.fs.root, href)
      : path.resolve(path.dirname(this.path), href)
    const relPath = path.relative(this.fs.root, absPath)
    if (strict && relPath.indexOf('..') === 0) return false
    return relative ? relPath : absPath
  }
}
