import { Promise } from 'bluebird'
import path from 'path'
import _ from 'lodash'
import { DefaultTreeAdapterTypes as parse5, parse, serialize, defaultTreeAdapter } from 'parse5'
import File, { FileConstructorArgs } from './base'
import type { IExtensionOptions } from '../interfaces'

export type IFileHtmlOptions = IExtensionOptions<{
  commons: {
    [type: string]: string[]
  }
}>

const DEFAULTS = {
  commons: {
    style: ['gatsby-global-css'],
    script: ['gatsby-chunk-mapping'],
  },
}

/**
 * A callback function to be run on tree nodes
 * @see FileHtml.walk
 */
export type IFileHtmlNodeWalker = (
  node: parse5.Node,
  prev?: parse5.Node,
  next?: parse5.Node,
) => Promise<void> | void

/**
 * Interface for html files
 */
export class FileHtml extends File {
  /**
   * Path to the html page
   */
  pagePath: string

  /**
   * Compiled ast tree
   */
  tree: parse5.Document

  /**
   * Parse5 tree adaptor
   */
  adaptor = defaultTreeAdapter

  /**
   * Html extension options
   */
  declare options: IFileHtmlOptions

  /**
   * Sets the page path and creates an empty parse5 document
   * @internal
   */
  constructor(rel: string, options: IFileHtmlOptions, args: FileConstructorArgs) {
    super(rel, options, args)

    // @todo options should be loaded once
    this.options = _.defaultsDeep(options, DEFAULTS)

    // Set the path to the html page
    const parts = rel.slice(0, -5).split(path.sep)
    const l = parts.length - 1
    if (parts[l] === 'index') parts.pop()
    else if (parts[l] === '404') parts[l] = '404.html'
    parts.unshift(args.gatsby.pathPrefix)
    this.pagePath = parts.join('/') || '/'

    // Create an empty document
    this.tree = this.adaptor.createDocument()
  }

  /**
   * Reads the file then compiles its html to ast
   * @internal
   */
  read(): Promise<void> {
    const payload = this.emitPayload<FileHtml>()
    return this.file
      .read()
      .then((html) =>
        this.emit(
          'html',
          'parse',
          {
            ...payload,
            html,
          },
          'html',
        ),
      )
      .then((html) => {
        this.tree = parse(html)
        return this.emit('html', 'tree', payload)
      }) as Promise<void>
  }

  /**
   * Invokes html.node events on all nodes
   * @internal
   */
  process(): Promise<void> {
    return this.walk((node, previousNode, nextNode) => {
      return this.emit('html', 'node', {
        ...this.emitPayload<FileHtml>(),
        node,
        previousNode,
        nextNode,
      }) as unknown as Promise<void>
    })
  }

  /**
   * Serializes the tree back to html and writes the file
   * @internal
   */
  write(): Promise<void> {
    const payload = this.emitPayload<FileHtml>()
    return this.emit('html', 'serialize', payload)
      .then(() => {
        const html = serialize(this.tree)
        return this.emit(
          'html',
          'write',
          {
            ...payload,
            html,
          },
          'html',
        )
      })
      .then((html) => this.file.update(html))
  }

  /**
   * Recursively walks through a parse5 tree invoking a callback
   *  on every node on the tree.
   */
  walk(
    cb: IFileHtmlNodeWalker,
    root: parse5.Node = this.tree,
    processGatsbyNode = false,
  ): Promise<void> {
    let gatsby = processGatsbyNode
    const walker = async (
      curr: parse5.Node,
      prev?: parse5.Node,
      next?: parse5.Node,
    ): Promise<void> => {
      // Disallow processing `___gatsby` node and its descendants by default
      if (
        !gatsby &&
        'attrs' in curr &&
        curr.attrs.find((a) => a.name === 'id')?.value === '___gatsby'
      ) {
        gatsby = true
        return
      }
      await cb(curr, prev, next)
      if ('childNodes' in curr) {
        await Promise.each(curr.childNodes, (childNode, i) => {
          return walker(childNode, curr.childNodes[i - 1], curr.childNodes[i + 1])
        })
      }
    }
    return walker(root)
  }

  /**
   * Resolves a href attribute of a given node into local file path
   *
   * @todo test this method on win32 platform
   * @param node - Parse5 element node
   * @param attrib - Target attribute. Defaults to `href`
   * @param relative - Return path relative to `/public`. Defaults to `true`
   * @param strict - Return false if resolved path is outside `/public`. Defaults to `true`
   * @return Resolved file path or false on failure to meet conditions
   */
  resolveHref(
    node: parse5.Element,
    attrib = 'href',
    relative = true,
    strict = true,
  ): string | boolean {
    const { filesystem, gatsby } = this.emitPayload()
    const attr = node.attrs.find((a) => a.name === attrib)
    if (attr === undefined) return false
    let href = attr.value.trim()
    if (href === '' || /^\w+:\/\//.test(href)) return false
    const prefix = gatsby.pathPrefix
    if (prefix !== '') {
      if (href.indexOf(prefix) === 0) {
        href = href.replace(prefix, '')
        // absolute path oustide gatsby root
      } else if (path.isAbsolute(href)) {
        return false
      }
    }

    const absPath = path.isAbsolute(href)
      ? path.join(filesystem.root, href)
      : path.resolve(path.dirname(this.path), href)
    const relPath = path.relative(filesystem.root, absPath)
    if (strict && relPath.indexOf('..') === 0) return false
    return relative ? relPath : absPath
  }
}

export default FileHtml
