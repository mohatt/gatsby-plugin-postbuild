import { Promise } from 'bluebird'
import { promises as fs } from 'fs'
import path from 'path'
import parse5 from 'parse5'
import * as htmlparser2 from 'parse5-htmlparser2-tree-adapter'
import _ from 'lodash'
import { Purger, PurgeResult } from './purger'
import { FileWriter } from './writer'
import { AssetMapper } from './mapper'
import { options, createDebug, sha1, extName } from '../util'
const debug = createDebug('purgecss/html')

export type INode = htmlparser2.Node
export type IElement = htmlparser2.Element
export type IElementText = htmlparser2.TextNode
export type INodeWalker = (node: INode) => boolean

/**
 * Recursively walks through a htmlparser2 tree invoking a callback
 *  on every node on the tree. If the callback returned false
 *  the node will be removed
 *
 *  Note: This function may mutate the node tree
 *
 * @param {INode} node
 * @param {INodeWalker} cb
 * @return {boolean} - Return value is used for recursion
 */
function walk (node: INode, cb: INodeWalker): boolean {
  if ('children' in node) {
    if (node.children.length === 0) return cb(node)
    if (!cb(node)) return false
    node.children = node.children.filter(childNode => {
      return walk(childNode, cb)
    })
    return true
  }
  return cb(node)
}

/**
 * Interface for style objects
 */
export abstract class IStyle {
  /**
   * Style ID which should be set for shared styles
   */
  protected id?: string

  /**
   * Sets the id of the style object
   */
  setID (id: string): void {
    this.id = id
  }

  /**
   * Reads the id of the style object
   */
  getID (): string {
    return this.id !== undefined ? this.id : ''
  }

  /**
   * Check if the style object has an id
   */
  hasID (): boolean {
    return this.id !== undefined
  }

  /**
   * Reads the original css string
   */
  abstract read (): Promise<string>|string

  /**
   * Writes the optimized css string
   */
  abstract write (result: PurgeResult): Promise<void>|void
}

/**
 * Handles inline style nodes
 */
export class StyleInline extends IStyle {
  private textNode: IElementText
  constructor (node: IElementText) {
    super()
    this.textNode = node
  }

  /**
   * @inheritDoc
   */
  read (): string {
    return this.textNode.data
  }

  /**
   * @inheritDoc
   */
  write (result: PurgeResult): void {
    this.textNode.data = result.css
  }
}

/**
 * Handles external css files
 */
export class StyleFile extends IStyle {
  private readonly writer: FileWriter
  private readonly path: string
  constructor (writer: FileWriter, path: string) {
    super()
    this.writer = writer
    this.path = path
  }

  /**
   * @inheritDoc
   */
  async read (): Promise<string> {
    await fs.access(this.path)
    return await fs.readFile(this.path, 'utf-8')
  }

  /**
   * @inheritDoc
   */
  async write (result: PurgeResult): Promise<void> {
    await this.writer.write(this.path, result.css, result.rejected)
  }
}

/**
 * Handles html parsing/serialization and asset searching
 */
export class HtmlFile {
  /**
   * Path to the html file
   */
  path: string

  /**
   * Compiled ast tree
   */
  tree: htmlparser2.Document

  /**
   * Html string without CSS
   */
  nakedHtml: string

  /**
   * List of styles found in html with their metadata
   */
  styles: IStyle[] = []

  /**
   * Absolute paths to scripts found in html
   */
  scripts: string[] = []

  private readonly mapper
  private readonly purger
  private readonly writer

  /**
   * Creates a new instance for the given file path
   */
  constructor (path: string, mapper: AssetMapper, purger: Purger, writer: FileWriter) {
    this.path = path
    this.tree = htmlparser2.createDocument()
    this.nakedHtml = ''
    this.mapper = mapper
    this.purger = purger
    this.writer = writer
  }

  /**
   * Parses the html file into ast and writes
   * a style-less copy of it
   */
  async load (): Promise<void> {
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
    debug('Loaded html file', this.path)
  }

  /**
   * Searches for css/js assets in ast
   */
  loadAssets (): void {
    let inHead = true
    walk(this.tree, node => {
      if (node.name === 'body') {
        inHead = false
      } else if (node.name === 'style') {
        this.addStyle(node, inHead)
      } else if (node.name === 'link') {
        const rel = 'rel' in node.attribs && node.attribs.rel.toLowerCase().trim()
        if (rel === 'stylesheet') {
          this.addStyle(node, inHead)
        }
      } else if (node.name === 'script') {
        this.addScript(node)
      }
      return true
    })
    debug('Loaded html file assets', _.pick(this, ['path', 'styles', 'scripts']))
  }

  /**
   * Creates a style object for the given <style> or <link> node
   * then appends it to {self.styles}
   */
  addStyle (node: IElement, head = false): void {
    if (node.name === 'link') {
      const stylePath = this.resolveHref(node)
      if (typeof stylePath !== 'string' ||
        extName(stylePath, 'css') === false ||
        this.mapper.shouldIgnoreFile(stylePath)) {
        return
      }
      const style = new StyleFile(this.writer, stylePath)
      style.setID(stylePath)
      this.mapper.linkStyleToFile(stylePath, this)
      this.styles.push(style)
      return
    }

    if (node.children.length === 0) return
    const style = new StyleInline(node.children[0] as IElementText)
    if (head) {
      const id = 'id' in node.attribs && node.attribs.id !== ''
        ? node.attribs.id
        : sha1(style.read(), true)
      style.setID(id)
      this.mapper.linkStyleToFile(id, this)
    }
    this.styles.push(style)
  }

  /**
   * Creates a script filename from the given <script> node
   * checks if the script should be ignored, then appends
   * it to {self.scripts}
   */
  addScript (node: IElement): void {
    const scriptPath = this.resolveHref(node, 'src')
    if (typeof scriptPath !== 'string' ||
      extName(scriptPath, 'js') === false ||
      this.mapper.shouldIgnoreFile(scriptPath)) {
      return
    }
    this.scripts.push(scriptPath)
  }

  /**
   * Resolves a href attribute of a given node into local file path
   *
   * @param node - Element node object
   * @param attrib - name of the attribute
   * @return resolved file path or false on failure
   */
  resolveHref (node: IElement, attrib = 'href'): string|boolean {
    if (!(attrib in node.attribs)) return false
    let href = node.attribs[attrib].trim()
    if (href === '' || /^\w+:\/\//.test(href)) return false
    const prefix = options._pathPrefix
    if (prefix !== '') {
      if (href.indexOf(prefix) === 0) {
        href = href.replace(prefix, '')
      } else if (path.isAbsolute(href)) {
        return false
      }
    }

    if (path.isAbsolute(href)) {
      return path.join(options._public, href)
    }
    return path.resolve(path.dirname(this.path), href)
  }

  /**
   * Purges all style nodes then writes the final
   * optimized html file
   */
  purgeStyles (): Promise<void> {
    debug('Purging styles for html file', this.path)
    return Promise.mapSeries(this.styles, style => {
      return this.purger.purge(style, this)
    }).then(async result => {
      debug('Serializing purged html tree for', this.path)
      const ndata = parse5.serialize(this.tree, { treeAdapter: htmlparser2 })
      return await this.writer.write(
        this.path,
        ndata,
        options.purgecss.rejected ? result.flat() : null
      )
    })
  }
}
