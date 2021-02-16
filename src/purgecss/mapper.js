import path from 'path'
import { createDebug, extName, options } from '../util'
import _ from 'lodash'
const debug = createDebug('purgecss/mapper')

/**
 * Handles linking/ignoring html, js and css files
 */
export class AssetMapper {
  /**
   * Styles shared between multiple html files
   * @type {Object}
   */
  sharedStyles = {}

  /**
   * Files to be excluded from optimization
   * @type {Object}
   */
  ignoredFiles = {
    pages: [],
    css: [],
    js: []
  }

  /**
   * Initializes the class and sets excluded files
   *
   * @constructor
   */
  constructor () {
    this.loadWebpackIgnores()
    this.loadFileIgnores()
    debug('Mapper initialized with ignoredFiles', this.ignoredFiles)
  }

  /**
   * Sets scripts ignored by their webpack chunkName
   */
  loadWebpackIgnores () {
    const ignoredChunks = options.ignoreFiles.webpack
    const chunks = require(path.join(options._public, 'webpack.stats.json')).assetsByChunkName
    ignoredChunks.forEach(chunk => {
      if (!chunks[chunk]) {
        return
      }
      chunks[chunk].forEach(file => {
        extName(file) === 'js' && this.ignoreFile(file, 'js')
      })
    })
  }

  /**
   * Sets files ignored by their filepath and extension
   */
  loadFileIgnores () {
    for (const ext in _.pick(options.ignoreFiles, ['pages', 'css', 'js'])) {
      for (const file of options.ignoreFiles[ext]) {
        if (!file) return
        const fileParts = [file]
        if (ext === 'pages') {
          fileParts.push('index.html')
        }
        this.ignoreFile(path.join(...fileParts), ext)
      }
    }
  }

  /**
   * Adds a given file to the ignored files list
   * of the given extension
   *
   * @param {string} file - file path relative to /public
   * @param {string} type
   */
  ignoreFile (file, type) {
    file = path.join(options._public, file)
    if (!this.ignoredFiles[type].includes(file)) {
      this.ignoredFiles[type].push(file)
    }
  }

  /**
   * Decides whether a file is ignored or not
   *
   * @param {string} file - absolute file path
   * @return {boolean}
   */
  shouldIgnoreFile (file) {
    let ext = extName(file)
    if (!ext) return false
    if (ext === 'html') ext = 'pages'
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
   *
   * @param {string} id
   * @param {HtmlFile} file
   */
  linkStyleToFile (id, file) {
    this.sharedStyles[id] ??= []
    if (!this.sharedStyles[id].includes(file)) {
      this.sharedStyles[id].push(file)
      debug('Linked style with file', [id, file.path])
    }
  }

  /**
   * Returns the list of files linked to a given style id
   * or false if the given id doesn't exist
   *
   * @param {string} id
   * @return {HtmlFile[]}
   */
  getStyleLinks (id) {
    if (id in this.sharedStyles) {
      return this.sharedStyles[id]
    }
    return []
  }
}
