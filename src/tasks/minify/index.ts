import { minify } from 'terser'
import cssnano from 'cssnano'
import HtmlContext, { Minifier } from './context'
import { FileHtml, ITask } from '@postbuild'
import { options, IMinifyTaskOptions } from './options'
import type { ITaskApiEvents } from '@postbuild'

class MinifyRuntime {
  private readonly contexts = new Map<string, HtmlContext>()
  readonly minifiers = new Map<string, Minifier>()
  readonly options: IMinifyTaskOptions

  constructor(options: IMinifyTaskOptions) {
    this.options = options
    this.createMinifiers()
  }

  private createMinifiers() {
    const terserOptions = typeof this.options.script !== 'boolean' ? this.options.script : {}
    this.minifiers.set('script', {
      minify: async (source) => {
        const result = await minify(source, terserOptions)
        return result.code ?? ''
      },
      cache: new Map(),
    })

    const cssnanoPreset = typeof this.options.style !== 'boolean' ? this.options.style : 'default'
    const cssnanoProcessor = cssnano({
      preset: cssnanoPreset,
    })
    this.minifiers.set('style', {
      minify: async (source) => {
        const result = await cssnanoProcessor.process(source, { from: undefined })
        return result.css
      },
      cache: new Map(),
    })
  }

  createContext(file: FileHtml) {
    this.contexts.set(file.relative, new HtmlContext(file, this.options))
  }

  getContext(file: FileHtml) {
    return this.contexts.get(file.relative)
  }

  deleteContext(file: FileHtml) {
    this.contexts.delete(file.relative)
  }
}

let runtime: MinifyRuntime | undefined

export const events: ITaskApiEvents<IMinifyTaskOptions> = {
  on: {
    postbuild: ({ options }) => {
      runtime = new MinifyRuntime(options)
    },
    shutdown: () => {
      runtime = undefined
    },
  },
  html: {
    tree: ({ file }) => {
      runtime.createContext(file)
    },
    node: ({ node, file }) => {
      runtime.getContext(file).processNode(node)
    },
    serialize: async ({ file }) => {
      const context = runtime.getContext(file)
      try {
        await context.minify(runtime.minifiers)
      } catch (e: any) {
        throw new Error(`Failed minifying "${file.relative}": ${e}`)
      } finally {
        runtime.deleteContext(file)
      }
    },
  },
}

const task: ITask<IMinifyTaskOptions> = {
  id: 'minify',
  events,
  options,
}

export default task
