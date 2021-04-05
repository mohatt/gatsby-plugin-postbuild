import { Promise } from 'bluebird'
import crypto from 'crypto'
import * as parse5 from 'parse5'
import { cloneDeep } from 'lodash'
import type { Filesystem, FileHtml } from '@postbuild'
import type { Purger, IPurgeResult } from './purger'
import type AssetMapper from './mapper'
import type IOptions from '../options'

/**
 * Utility function to create an id for an inline
 * style element that is shared between multiple html
 * files
 */
function createStyleId (css: string): string {
  return crypto.createHash('sha1')
    .update(css, 'utf8')
    .digest('base64')
}

/**
 * Interface for style objects
 */
export abstract class HtmlStyle {
  /**
   * Style ID used for linking styles to html files
   */
  protected id?: string
  getID = (): string => this.id !== undefined ? this.id : ''
  hasID = (): boolean => this.id !== undefined
  setID = (id: string): void => {
    this.id = id
  }

  /**
   * Reads the original css string
   */
  abstract read (): Promise<string>|string

  /**
   * Writes the optimized css string
   */
  abstract update (result: IPurgeResult): Promise<void>|void
}

/**
 * Handles inline style nodes
 */
export class HtmlStyleInline extends HtmlStyle {
  private textNode: parse5.TextNode
  constructor (node: parse5.TextNode) {
    super()
    this.textNode = node
  }

  read (): string {
    return this.textNode.value
  }

  update (result: IPurgeResult): void {
    this.textNode.value = result.css
  }
}

/**
 * Handles external css files
 */
export class HtmlStyleFile extends HtmlStyle {
  private readonly fs: Filesystem
  private readonly options: IOptions
  private readonly path: string
  constructor (path: string, options: IOptions, fs: Filesystem) {
    super()
    this.fs = fs
    this.options = options
    this.path = path
  }

  read (): Promise<string> {
    return this.fs.read(this.path)
  }

  update (result: IPurgeResult): Promise<void> {
    return this.fs.update(this.path, result.css, {
      purgecss: String(result.rejected.length)
    }).then(() => {
      if (this.options.writeRejected) {
        return this.fs.create(this.path + '.rejected.txt', result.rejected.join(' '))
      }
    })
  }
}

/**
 * Handles html parsing/serialization and asset searching
 */
export class HtmlOptimizer {
  /**
   * File object received from postbuild
   */
  readonly file: FileHtml

  /**
   * Html string without inline styles
   */
  html: string = ''

  /**
   * List of scripts found in html
   */
  readonly scripts: string[] = []

  /**
   * List of styles found in html with their metadata
   */
  private readonly styles: HtmlStyle[] = []

  private readonly options: IOptions
  private readonly fs: Filesystem
  private readonly mapper: AssetMapper
  private readonly purger: Purger
  private _inHead = true

  /**
   * Creates a new instance for the given html file
   */
  constructor (file: FileHtml, options: IOptions, fs: Filesystem, mapper: AssetMapper, purger: Purger) {
    this.options = options
    this.file = file
    this.fs = fs
    this.mapper = mapper
    this.purger = purger
  }

  /**
   * Clones the ast tree and creates a style-ess
   * copy of it
   */
  async load (): Promise<void> {
    // clone the tree and remove all <style> nodes
    const purgedTree = cloneDeep(this.file.tree)
    await this.file.walk(node => {
      if (node.nodeName === 'style') {
        this.file.adaptor.detachNode(node)
      }
    }, purgedTree)
    // then serialize it back to HTML
    this.html = parse5.serialize(purgedTree)
  }

  /**
   * Searches for css/js assets in ast nodes
   */
  processNode (node: parse5.Node): void {
    if (node.nodeName === 'head') {
      this._inHead = true
      return
    }
    if (node.nodeName === 'body') {
      this._inHead = false
      return
    }
    if (node.nodeName === 'style') {
      return this.addStyle(node)
    }
    if (node.nodeName === 'link') {
      const rel = node.attrs.find(a => a.name === 'rel')
      if (rel?.value.toLowerCase().trim() !== 'stylesheet') return
      return this.addStyle(node)
    }
    if (node.nodeName === 'script') {
      this.addScript(node)
    }
  }

  /**
   * Creates a style object for the given <style> or <link> node
   * then appends it to {self.styles}
   */
  addStyle (node: parse5.Element): void {
    if (node.nodeName === 'link') {
      const stylePath = this.file.resolveHref(node)
      if (typeof stylePath !== 'string' ||
        this.fs.extension(stylePath, 'css') === false ||
        this.mapper.shouldIgnoreFile(stylePath)) {
        return
      }
      const style = new HtmlStyleFile(stylePath, this.options, this.fs)
      style.setID(stylePath)
      this.mapper.linkStyleToHtml(stylePath, this)
      this.styles.push(style)
      return
    }

    if (node.childNodes.length === 0) return
    const style = new HtmlStyleInline(node.childNodes[0] as parse5.TextNode)
    if (this._inHead) {
      const idAttr = node.attrs.find(a => a.name === 'id')
      const id = idAttr !== undefined && idAttr.value !== ''
        ? idAttr.value
        : createStyleId(style.read())
      style.setID(id)
      this.mapper.linkStyleToHtml(id, this)
    }
    this.styles.push(style)
  }

  /**
   * Creates a script filename from the given <script> node
   * checks if the script should be ignored, then appends
   * it to {self.scripts}
   */
  addScript (node: parse5.Element): void {
    const scriptPath = this.file.resolveHref(node, 'src')
    if (typeof scriptPath !== 'string' ||
      this.fs.extension(scriptPath, 'js') === false ||
      this.mapper.shouldIgnoreFile(scriptPath)) {
      return
    }
    this.scripts.push(scriptPath)
  }

  /**
   * Purges all style nodes
   */
  purgeStyles (): Promise<void> {
    return Promise.map(this.styles, style => {
      return this.purger.purge(style, this)
    }).then(result => {
      const rejected = result.flat()
      this.file.reportMeta.purgecss = String(rejected.length)
      if (this.options.writeRejected) {
        return this.fs.create(this.file.relative + '.rejected.txt', rejected.join(' '))
      }
    })
  }
}

export default HtmlOptimizer
