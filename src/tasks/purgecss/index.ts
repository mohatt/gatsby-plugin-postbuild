import { HtmlTransformer } from './lib/html'
import { AssetMapper } from './lib/mapper'
import { Purger } from './lib/purger'
import type { FileHtml } from '~/files'
import type { Filesystem } from '~/filesystem'
import type { ITaskApiEvents } from '~/tasks'
import type { IPurgecssOptions } from './options'

/**
 * Holds refrences to required dependencies
 */
class DIContainer {
  transformers: {
    [file: string]: HtmlTransformer
  } = {}

  readonly options: IPurgecssOptions
  readonly fs: Filesystem
  readonly mapper: AssetMapper
  readonly purger: Purger
  constructor (options: IPurgecssOptions, fs: Filesystem, mapper?: AssetMapper, purger?: Purger) {
    this.options = options
    this.fs = fs
    this.mapper = mapper ?? new AssetMapper(this.options, this.fs)
    this.purger = purger ?? new Purger(this.options, this.fs, this.mapper)
  }

  createTrans (file: FileHtml): void {
    this.transformers[file.relative] = new HtmlTransformer(
      file, this.options, this.fs, this.mapper, this.purger
    )
  }

  getTrans (file: FileHtml): HtmlTransformer {
    return this.transformers[file.relative]
  }

  deleteTrans (file: FileHtml): void {
    delete this.transformers[file.relative]
  }
}

let di: DIContainer
// @ts-expect-error
export const events: ITaskApiEvents<IPurgecssOptions> = {
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
      di.createTrans(file)
      return di.getTrans(file).load()
    },
    node: ({ node, file }) => {
      di.getTrans(file).processNode(node)
    },
    serialize: ({ file }) => {
      return di.getTrans(file).purgeStyles()
        .then(() => di.deleteTrans(file))
    }
  }
}

export { options } from './options'
