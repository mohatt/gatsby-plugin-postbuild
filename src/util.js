import path from 'path'
import crypto from 'crypto'
import _ from 'lodash'
import Debug from 'debug'

/**
 * Global options object
 *
 * @type {Object}
 */
export let options

/**
 * Private store for internal use
 *
 * @type {Map<string,Object>}
 */
const store = new Map([
  ['reporter', null],
  ['debug', new Map()]
])

/**
 * Initializes plguin options and other utilities
 *
 * @param {Object=} args
 * @param   {Object} args.defaultOptions - Options defaults
 * @param   {Object} args.pluginOptions - Plugin options
 * @param   {Object} args.gatsby - Gatsby's onPreBootstrap event object
 * @return {Object} Plugin options
 */
export function bootstrap ({ defaultOptions, pluginOptions, gatsby }) {
  // Merge user-defined options with defaults
  options = _.merge(defaultOptions, pluginOptions)
  // set private options
  options._plugin = 'gatsby-plugin-postbuild'
  options._root = gatsby.store.getState().program.directory
  options._public = path.join(options._root, 'public')
  options._cache = gatsby.cache.directory
  options._pathPrefix = gatsby.pathPrefix
  // Prevent mutations on options object
  Object.freeze(options)

  // Initialize reporter
  const reporter = gatsby.reporter
  const errorMap = {
    10000: {
      text: context => context.message,
      level: 'ERROR',
      type: 'PLUGIN'
    }
  }
  if (reporter.setErrorMap) {
    reporter.setErrorMap(errorMap)
  }
  store.set('reporter', reporter)
  debug('Plugin initialized', options)
}

/**
 * Prints an info message
 *
 * @param {string} message
 */
export function reporter (message) {
  const reporter = store.get('reporter')
  reporter.info(`${options._plugin}:\n ${message}`)
}

/**
 * Prints an error message and terminates the current process
 *
 * @param {string} message
 * @param {Error} e
 */
reporter.error = function (message, e = null) {
  const reporter = store.get('reporter')
  const prefix = `${options._plugin} threw an error while running`

  if (!e) {
    reporter.panic({
      id: '10000',
      context: {
        message: prefix
      },
      error: new Error(message)
    })
    return
  }

  reporter.panic({
    id: '10000',
    context: {
      message: `${prefix}:\n ${message}`
    },
    error: e
  })
}

/**
 * Prints a warning message
 *
 * @param {string} message
 */
reporter.warning = function (message) {
  const reporter = store.get('reporter')
  const prefix = `${options._plugin} might not be working properly`
  reporter.warn(`${prefix}:\n ${message}`)
}

/**
 * Prints a success message
 *
 * @param {string} message
 */
reporter.success = function (message) {
  const reporter = store.get('reporter')
  reporter.success(`${options._plugin}:\n ${message}`)
}

/**
 * Prints a debug message
 *
 * @param {string} message
 * @param {any} data
 */
export function debug (message, data = null) {
  createDebug()(...arguments)
}

/**
 * Creates a debug instance for the given namespace
 *
 * @param {string} namespace
 * @return {Function}
 */
export function createDebug (namespace = '') {
  let ns = options._plugin
  if (namespace) {
    ns += ':' + namespace
  }

  const cache = store.get('debug')
  if (cache.has(ns)) {
    return cache.get(ns)
  }

  const realDebug = Debug(ns)
  const debug = function (message) {
    arguments[0] = arguments.length > 1
      ? `${message} %O \n`
      : `${message} \n`
    realDebug(...arguments)
  }

  cache.set(ns, debug)
  return debug
}

/**
 * Creates a sha1 hash from a string.
 *
 * @param {string} data
 * @param {boolean} base64
 */
export function sha1 (data, base64 = false) {
  return crypto.createHash('sha1')
    .update(data, 'utf8')
    .digest(base64 ? 'base64' : 'hex')
}
