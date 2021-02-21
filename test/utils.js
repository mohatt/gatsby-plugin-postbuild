import fs from 'fs'
import path from 'path'
import mkdirp from 'mkdirp'
import { onPreBootstrap } from '../src'

/**
 * Make sure to mock the fs module in your test
 * file before using any of these functions
 */

/**
 * Virtual project root directory
 * @see /test/__mocks__/fs.js
 * @type {string}
 */
export const programRoot = '/virtual/project'

/**
 * Changes plugin options by invoking the onPreBootstrap hook
 * Tests that run after calling this function will receive
 * the mounted options
 *
 * Note: Make sure to wrap this in a try..catch block when you
 * pass custom options since it may throw errors
 *
 * @param {Object} options
 */
export function mountOptions (options = {}) {
  onPreBootstrap({
    store: {
      getState: () => ({
        program: { directory: programRoot }
      })
    },
    reporter: {},
    pathPrefix: ''
  }, options)
}

/**
 * Mounts a directory on the virtual filesystem
 *
 * @param {string} dirname
 */
export function mountDir (dirname) {
  dirname = path.resolve(programRoot, dirname)
  !fs.existsSync(dirname) && mkdirp.sync(dirname)
}

/**
 * Mounts a file on the virtual filesystem
 *
 * @param {string} filename
 * @param {string} content
 */
export function mountFile (filename, content = '//noop') {
  mountDir(path.dirname(filename))
  fs.writeFileSync(path.resolve(programRoot, filename), content.toString())
}

/**
 * Mocks a virtual module by path Usefull when requiring
 * a module that doesn't exist on the filesystem
 *
 * @param {string} name - module name
 * @param {object} exports - module exports
 */
export function mountModule (name, exports) {
  jest.doMock(path.resolve(programRoot, name), () => exports, { virtual: true })
}
