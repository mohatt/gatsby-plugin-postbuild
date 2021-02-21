import path from 'path'
import { createDebug, extName, options } from '../util'
import { HtmlFile } from './html'
const debug = createDebug('purgecss/mapper')

/**
 * Handles linking/ignoring html, js and css files
 */
export class AssetMapper {
  /**
   * Styles shared between multiple html files
   */
  sharedStyles: {
    [id: string]: HtmlFile[]
  } = {}

  /**
   * Files to be excluded from optimization
   */
  ignoredFiles: {
    [ext: string]: string[]
  } = {
    html: [],
    css: [],
    js: []
  }

  /**
   * Initializes the class and sets excluded files
   */
  constructor () {
    this.loadWebpackIgnores()
    this.loadFileIgnores()
    debug('Mapper initialized with ignoredFiles', this.ignoredFiles)
  }

  /**
   * Sets scripts ignored by their webpack chunkName
   */
  loadWebpackIgnores (): void {
    const ignoredChunks = options.ignoreFiles.webpack
    if (ignoredChunks.length === 0) {
      return
    }

    let chunks: {
      [index: string]: string[]
    }
    const statsFile = path.join(options._public, 'webpack.stats.json')
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
        extName(file) === 'js' && this.ignoreFile(file)
      })
    })
  }

  /**
   * Sets files ignored by their filepath and extension
   */
  loadFileIgnores (): void {
    for (const ext of ['pages', 'css', 'js']) {
      // @ts-expect-error
      for (let file of options.ignoreFiles[ext]) {
        if (file === '') file = '/'
        if (ext === 'pages') {
          file = path.join(file, 'index.html')
        }
        this.ignoreFile(file)
      }
    }
  }

  /**
   * Adds a given file to the ignored files list
   * of the given extension
   *
   * @param {string} file - file path relative to /public
   */
  ignoreFile (file: string): void {
    file = path.join(options._public, file)
    const ext = extName(file)
    if (typeof ext !== 'string' || !(ext in this.ignoredFiles)) return
    if (!this.ignoredFiles[ext].includes(file)) {
      this.ignoredFiles[ext].push(file)
    }
  }

  /**
   * Decides whether a file is ignored or not
   *
   * @param {string} file - absolute file path
   */
  shouldIgnoreFile (file: string): boolean {
    const ext = extName(file)
    if (typeof ext !== 'string') return false
    if (!(ext in this.ignoredFiles)) {
      debug('Unknown ignore file type', [file, ext])
      return false
    }

    const check = this.ignoredFiles[ext].includes(file)
    if (check) {
      debug('Ignoring file', file)
    }
    return check
  }

  /**
   * Links a given style id to a html file
   */
  linkStyleToFile (id: string, file: HtmlFile): void {
    this.sharedStyles[id] ??= []
    if (!this.sharedStyles[id].includes(file)) {
      this.sharedStyles[id].push(file)
      debug('Linked style with file', [id, file.path])
    }
  }

  /**
   * Returns the list of files linked to a given style id
   * or false if the given id doesn't exist
   */
  getStyleLinks (id: string): HtmlFile[] {
    if (id in this.sharedStyles) {
      return this.sharedStyles[id]
    }
    return []
  }
}
