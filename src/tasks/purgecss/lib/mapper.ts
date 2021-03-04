import path from 'path'
import { Filesystem } from '~/filesystem'
import { createDebug } from '~/common'
import { HtmlTransformer } from './html'
import { IPurgecssOptions } from '../options'
const debug = createDebug('purgecss/mapper')

/**
 * Handles linking/ignoring html, js and css files
 */
export class AssetMapper {
  /**
   * Styles shared between multiple html files
   */
  sharedStyles: {
    [id: string]: HtmlTransformer[]
  } = {}

  /**
   * Files to be excluded from optimization
   */
  ignoredFiles: {
    [ext: string]: string[]
  } = {
    css: [],
    js: []
  }

  private readonly fs: Filesystem
  private readonly options: IPurgecssOptions
  /**
   * Initializes the class and sets excluded files
   */
  constructor (options: IPurgecssOptions, fs: Filesystem) {
    this.fs = fs
    this.options = options
    this.loadWebpackIgnores()
    this.loadFileIgnores()
    debug('Mapper initialized with ignoredFiles', this.ignoredFiles)
  }

  /**
   * Sets scripts ignored by their webpack chunkName
   */
  loadWebpackIgnores (): void {
    const ignoredChunks = this.options.ignoreAssets.webpack
    if (ignoredChunks.length === 0) {
      return
    }

    let chunks: {
      [index: string]: string[]
    }
    const statsFile = path.join(this.fs.root, 'webpack.stats.json')
    try {
      chunks = require(statsFile).assetsByChunkName
    } catch (e) {
      throw new Error(`Unable to load "webpack.stats.json" from "${statsFile}"`)
    }

    ignoredChunks.forEach(chunk => {
      if (!(chunk in chunks)) {
        return
      }
      chunks[chunk].forEach(file => {
        this.fs.extension(file) === 'js' && this.ignoreFile(file)
      })
    })
  }

  /**
   * Sets files ignored by their filepath and extension
   */
  loadFileIgnores (): void {
    for (const ext of ['css', 'js']) {
      for (const file of this.options.ignoreAssets[ext as 'css'|'js']) {
        this.ignoreFile(file)
      }
    }
  }

  /**
   * Adds a given file to the ignored files list
   * of the given extension
   */
  ignoreFile (file: string): void {
    const ext = this.fs.extension(file) as string
    if (!(ext in this.ignoredFiles)) return
    if (!this.ignoredFiles[ext].includes(file)) {
      this.ignoredFiles[ext].push(file)
    }
  }

  /**
   * Decides whether a file is ignored or not
   */
  shouldIgnoreFile (file: string): boolean {
    const ext = this.fs.extension(file) as string
    if (!(ext in this.ignoredFiles)) {
      debug('Unknown ignore file type', [file, ext])
      return false
    }
    return this.ignoredFiles[ext].includes(file)
  }

  /**
   * Links a given style id to a html file
   */
  linkStyleToHtml (id: string, html: HtmlTransformer): void {
    this.sharedStyles[id] ??= []
    if (!this.sharedStyles[id].includes(html)) {
      this.sharedStyles[id].push(html)
      debug('Linked style with file', [id, html.file.relative])
    }
  }

  /**
   * Returns the list of html files linked to a given style id
   */
  getStyleLinks (id: string): HtmlTransformer[] {
    if (id in this.sharedStyles) {
      return this.sharedStyles[id]
    }
    return []
  }
}
