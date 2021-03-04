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
export class DIContainer {
  files: {
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

  createFile (file: FileHtml): void {
    this.files[file.relative] = new HtmlTransformer(
      file,
      this.options,
      this.fs,
      this.mapper,
      this.purger
    )
  }

  getFile (file: FileHtml): HtmlTransformer {
    return this.files[file.relative]
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
    tree: ({ file }) => {
      di.createFile(file)
      return di.getFile(file).load()
    },
    node: ({ node, file }) => {
      di.getFile(file).processNode(node)
    },
    serialize: ({ file }) => {
      return di.getFile(file).purgeStyles()
    }
  }
}

export { options } from './options'
