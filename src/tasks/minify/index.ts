import { Promise } from 'bluebird'
import { minify } from 'terser'
import cssnano from 'cssnano'
import HtmlContext from './context'
import { FileHtml } from '@postbuild'
import type IOptions from './options'
import type { ITaskApiEvents } from '@postbuild'

/**
 * Represents a minifier for a specific source type (eg. script)
 */
export interface Minifier {
  minify: (source: string) => Promise<string>
  cache: Map<string, string>
}

/**
 * Holds refrences to required dependencies
 */
class Container {
  readonly contexts: Map<string, HtmlContext> = new Map()
  readonly minifiers: Record<string, Minifier> = {}
  readonly options: IOptions
  constructor (options: IOptions) {
    this.options = options
    this.createMinifiers()
  }

  createMinifiers (): void {
    const terserOptions = typeof this.options.script !== 'boolean'
      ? this.options.script
      : {}
    this.minifiers.script = {
      minify: source => minify(source, terserOptions)
        .then(res => {
          if (res.code !== undefined) {
            return res.code
          }
          return ''
        }),
      cache: new Map()
    }
    const cssnanoPreset = typeof this.options.style !== 'boolean'
      ? this.options.style
      : 'default'
    const cssnanoProcessor = cssnano({
      preset: cssnanoPreset
    })
    this.minifiers.style = {
      minify: source => cssnanoProcessor
        .process(source)
        .then(res => res.css),
      cache: new Map()
    }
  }

  createContext (file: FileHtml): void {
    this.contexts.set(file.relative, new HtmlContext(file, this.options))
  }

  getContext (file: FileHtml): HtmlContext {
    return this.contexts.get(file.relative) as HtmlContext
  }

  deleteContext (file: FileHtml): void {
    this.contexts.delete(file.relative)
  }
}

let di: Container
// @ts-expect-error
export const events: ITaskApiEvents<IOptions> = {
  on: {
    postbuild: ({ options }) => {
      di = new Container(options)
    }
  },
  html: {
    tree: ({ file }) => {
      di.createContext(file)
    },
    node: ({ node, file }) => {
      di.getContext(file).processNode(node)
    },
    serialize: ({ file }) => {
      return di.getContext(file)
        .minify(di.minifiers)
        .catch((e: string) => {
          throw new Error(`Failed minifying "${file.relative}": ${e}`)
        })
        .then(() => di.deleteContext(file))
    }
  }
}

export { options } from './options'
