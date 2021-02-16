import path from 'path'
import crypto from 'crypto'
import _ from 'lodash'
import Debug from 'debug'

/**
 * Global options object
 *
 * @type {Object}
 */
export let options = {
  _plugin: 'gatsby-plugin-postbuild'
}

/**
 * Initializes plguin options and other utilities
 *
 * @param {Object} $0
 * @param   {Object} $0.defaultOptions - Options defaults
 * @param   {Object} $0.pluginOptions - Plugin options
 * @param   {Object} $0.gatsby - Gatsby's onPreBootstrap event object
 */
export function bootstrap ({ defaultOptions, pluginOptions, gatsby }) {
  // Merge user-defined options with defaults
  options = _.mergeWith(
    options,
    defaultOptions,
    pluginOptions,
    // Ensure arrays aren't merged by index
    (to, from) => _.isArray(from) ? from : undefined
  )
  // set private options
  options._root = gatsby.store.getState().program.directory
  options._public = path.join(options._root, 'public')
  options._pathPrefix = gatsby.pathPrefix

  // Initialize reporter
  const reporter = gatsby.reporter
  const errorMap = {
    10000: {
      text: context => `${options._plugin} threw an error while running:\n ${context.message}`,
      level: 'ERROR',
      type: 'PLUGIN'
    }
  }
  if (reporter.setErrorMap) {
    reporter.setErrorMap(errorMap)
  }
  debug('Plugin initialized', options)
}

/**
 * Creates a new structured error to pass to gatsby's reporter
 *
 * @constructor
 * @param {string|Object} message
 * @param {Error|null} error
 * @param {number} code
 * @return {{ id: string, context: {Object}, error: error}}
 */
export function ReporterError (message, error = null, code = 10000) {
  return {
    id: `${options._plugin}_${code}`,
    context: typeof message === 'object'
      ? message
      : { message },
    error: error && typeof error === 'object'
      ? error
      : undefined
  }
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

  createDebug.cache ??= new Map()
  if (createDebug.cache.has(ns)) {
    return createDebug.cache.get(ns)
  }

  const realDebug = Debug(ns)
  const debug = function (message) {
    arguments[0] = arguments.length > 1
      ? `${message} %O \n\n`
      : `${message} \n\n`
    realDebug(...arguments)
  }

  createDebug.cache.set(ns, debug)
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
