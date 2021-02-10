import path from 'path'
import _ from 'lodash'
import Debug from 'debug'

/**
 * Initializes plguin options
 *
 * The function only runs when called with args to initialize and cache
 * options object. Subsequent calls without args return the cached value
 *
 * @param {Object=} args
 * @param   {Object} args.defaultOptions - Options defaults
 * @param   {Object} args.pluginOptions - Plugin options
 * @param   {Object} args.gatsby - Gatsby's onPreBootstrap event object
 * @return {Object} Plugin options
 */
export function initializeOptions (args) {
  if (arguments.length === 0) {
    if (initializeOptions.options === undefined) {
      return reportError('Cant fetch options because they are not initialized')
    }

    return initializeOptions.options
  }

  // Merge user-defined options with defaults
  const options = _.merge(args.defaultOptions, args.pluginOptions)
  // set directory paths
  options._root = args.gatsby.store.getState().program.directory
  options._public = path.join(options._root, 'public')
  // options._cache = args.gatsby.cache.directory

  // Cache the final options object
  debug('Options', options)

  process.exit()
  initializeOptions.options = options
  return options
}

/**
 * Initializes plugin reporter
 *
 * The function only runs when called with args to initialize and cache
 * reporter object. Subsequent calls without args return the cached value
 *
 * @param {Object} reporter - Reporter object
 * @return {Object} Reporter object
 */
export function initializeReporter (reporter) {
  if (arguments.length === 0) {
    if (initializeReporter.reporter === undefined) {
      throw new Error('Cant fetch reporter because it is not initialized')
    }

    return initializeReporter.reporter
  }

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

  initializeReporter.reporter = reporter
  return reporter
}

/**
 * Gets the initialized reporter object
 *
 * @return {Object}
 */
export function getReporter () {
  return initializeReporter()
}

/**
 * Prints an error message and terminates the current process
 *
 * @param {string} message
 * @param {Error} e
 */
export function reportError (message, e = null) {
  const reporter = getReporter()
  const prefix = '"gatsby-plugin-postbuild" threw an error while running'

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
export function reportWarning (message) {
  const reporter = getReporter()
  const prefix = '"gatsby-plugin-postbuild" might not be working properly'
  reporter.warn(`${prefix}:\n ${message}`)
}

/**
 * Prints a success message
 *
 * @param {string} message
 */
export function reportSuccess (message) {
  const reporter = getReporter()
  const prefix = '"gatsby-plugin-postbuild"'
  reporter.success(`${prefix}:\n ${message}`)
}

/**
 * Prints a debug message
 *
 * @param {string} message
 * @param {any} data
 */
export function debug(message, data = null) {
  debug.create()(...arguments)
}

/**
 * Creates a debug instance for the given namespace
 *
 * @param {string} namespace
 * @return {Function}
 */
debug.create = function (namespace = '') {
  let ns = 'gatsby-plugin-postbuild'
  if(namespace) {
    ns += ':' + namespace
  }
  debug.cache ??= {}
  if(debug.cache[ns]){
    return debug.cache[ns]
  }

  const dbg = Debug(ns)
  return debug.cache[ns] = function (message) {
    arguments[0] = arguments.length > 1
      ? `${message} %O \n`
      : `${message} \n`
    dbg(...arguments)
  }
}

/**
 * Gets the initialized options object
 *
 * @return {Object}
 */
export function getOptions () {
  return initializeOptions()
}

/**
 * Gets the value of a single option
 *
 * @param {string} optionName Dot-separated option name
 * @return {*} Option value
 */
export function getOption (optionName) {
  return _.get(getOptions(), optionName)
}

/**
 * Global options object
 *
 * @type {Object}
 */
export var options