import { Promise } from 'bluebird'
import type { DefaultTreeAdapterTypes as parse5 } from 'parse5'
import type { FileHtml } from '@postbuild'
import type { IOptions } from './options'
import type { Minifier } from './index'

/**
 * Handles html/js/css optimization
 */
export default class HtmlContext {
  /**
   * List of html styles/scripts that should be minized
   */
  private readonly assets: parse5.TextNode[] = []

  /**
   * List of html nodes that could be removed
   */
  private readonly removable: parse5.ChildNode[] = []

  private readonly file: FileHtml
  private readonly options: IOptions

  /**
   * Creates a new instance for the given html file
   */
  constructor(file: FileHtml, options: IOptions) {
    this.options = options
    this.file = file
  }

  /**
   * Searches for optimizable nodes in ast
   */
  processNode(node: parse5.Node): void {
    if (this.options[node.nodeName] === false) return
    switch (node.nodeName) {
      case '#comment':
        this.removable.push(node)
        break
      case 'meta':
        if (node.attrs.find((a) => a.name === 'name' && a.value === 'generator') !== undefined) {
          this.removable.push(node)
        }
        break
      case 'style':
      case 'script':
        if (node.childNodes.length) {
          const text = node.childNodes[0]
          if (text.nodeName === '#text') {
            this.assets.push(text as parse5.TextNode)
          }
        }
        break
    }
  }

  /**
   * Minifies all style/script nodes then writes the final
   * optimized html file
   */
  minify(minifiers: Record<string, Minifier>): Promise<void> {
    return Promise.map(this.assets, (text, i) => {
      const node = text.parentNode as parse5.Element
      const type = node.nodeName
      const id = node.attrs.find((a) => a.name === 'id')?.value.trim() as string
      const minifier = minifiers[type]
      if (minifier.cache.has(id)) {
        const cached = minifier.cache.get(id) as string
        if (cached === '') {
          this.removable.push(node)
          return null
        }
        text.value = cached
        return null
      }
      return minifier
        .minify(text.value)
        .catch((e) => {
          throw new Error(`Unable to minify ${type} node#${i}: ${String(e)}`)
        })
        .then((res) => {
          if (
            id &&
            type in this.file.options.commons &&
            this.file.options.commons[type].includes(id)
          ) {
            minifier.cache.set(id, res)
          }
          if (res === '') {
            this.removable.push(node)
            return
          }
          text.value = res
        })
    }).then(() => this.removable.forEach((node) => this.file.adaptor.detachNode(node)))
  }
}
