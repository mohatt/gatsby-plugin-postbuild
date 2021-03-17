import HtmlOptimizer from './lib/html'
import AssetMapper from './lib/mapper'
import Purger from './lib/purger'
import type IOptions from './options'
import type { ITaskApiEvents, Filesystem, FileHtml } from '@postbuild'

/**
 * Holds refrences to required dependencies
 */
class DIContainer {
  optimizers: {
    [file: string]: HtmlOptimizer
  } = {}

  readonly options: IOptions
  readonly fs: Filesystem
  readonly mapper: AssetMapper
  readonly purger: Purger
  constructor (options: IOptions, fs: Filesystem, mapper?: AssetMapper, purger?: Purger) {
    this.options = options
    this.fs = fs
    this.mapper = mapper ?? new AssetMapper(this.options, this.fs)
    this.purger = purger ?? new Purger(this.options, this.fs, this.mapper)
  }

  setOptimizer (file: FileHtml): void {
    this.optimizers[file.relative] = new HtmlOptimizer(
      file, this.options, this.fs, this.mapper, this.purger
    )
  }

  getOptimizer (file: FileHtml): HtmlOptimizer {
    return this.optimizers[file.relative]
  }

  unsetOptimizer (file: FileHtml): void {
    delete this.optimizers[file.relative]
  }
}

let di: DIContainer
// @ts-expect-error
export const events: ITaskApiEvents<IOptions> = {
  on: {
    postbuild: ({ filesystem, options }) => {
      di = new DIContainer(options, filesystem)
    }
  },
  html: {
    configure: ({ config }) => {
      config.strategy = 'sequential'
    },
    tree: ({ file }) => {
      di.setOptimizer(file)
      return di.getOptimizer(file).load()
    },
    node: ({ node, file }) => {
      di.getOptimizer(file).processNode(node)
    },
    serialize: ({ file }) => {
      return di.getOptimizer(file).purgeStyles()
        .then(() => di.unsetOptimizer(file))
    }
  }
}

export { options } from './options'
