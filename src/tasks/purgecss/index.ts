import HtmlContext from './lib/context'
import AssetMapper from './lib/mapper'
import Purger from './lib/purger'
import { options, IOptions } from './options'
import type { ITask, ITaskApiEvents, Filesystem, FileHtml } from '@postbuild'

/**
 * Holds refrences to required dependencies
 */
class DIContainer {
  contexts: {
    [file: string]: HtmlContext
  } = {}

  readonly options: IOptions
  readonly fs: Filesystem
  readonly mapper: AssetMapper
  readonly purger: Purger
  constructor(options: IOptions, fs: Filesystem, mapper?: AssetMapper, purger?: Purger) {
    this.options = options
    this.fs = fs
    this.mapper = mapper ?? new AssetMapper(this.options, this.fs)
    this.purger = purger ?? new Purger(this.options, this.fs, this.mapper)
  }

  createContext(file: FileHtml): HtmlContext {
    this.contexts[file.relative] = new HtmlContext(
      file,
      this.options,
      this.fs,
      this.mapper,
      this.purger,
    )
    return this.contexts[file.relative]
  }

  getContext(file: FileHtml): HtmlContext {
    return this.contexts[file.relative]
  }

  deleteContext(file: FileHtml): void {
    delete this.contexts[file.relative]
  }
}

let di: DIContainer
export const events: ITaskApiEvents<IOptions> = {
  on: {
    postbuild: ({ filesystem, options }) => {
      di = new DIContainer(options, filesystem)
    },
  },
  html: {
    configure: ({ config }) => {
      config.strategy = 'sequential'
    },
    tree: ({ file }) => {
      return di.createContext(file).load()
    },
    node: ({ node, file }) => {
      di.getContext(file).processNode(node)
    },
    serialize: ({ file }) => {
      return di
        .getContext(file)
        .purgeStyles()
        .then(() => di.deleteContext(file))
    },
  },
}

const task: ITask<IOptions> = {
  id: 'purgecss',
  events,
  options,
}

export default task
