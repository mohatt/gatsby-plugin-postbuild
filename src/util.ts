import path from 'path'
import crypto from 'crypto'
import { mergeWith, isArray } from 'lodash'
import Debug from 'debug'
import { defaults, IPluginOptions } from './options'
import {
  GatsbyNodeHelpers,
  GatsbyPluginOptions,
  GatsbyReporterErrorMap,
  GatsbyReporterErrorMeta
} from './gatsby'

/**
 * Options interface
 */
export interface IOptions extends IPluginOptions {
  _plugin: string
  _root: string
  _public: string
  _pathPrefix: string
}

/**
 * Global options object
 */
export let options: IOptions = {
  _plugin: 'gatsby-plugin-postbuild',
  _root: '',
  _public: '',
  _pathPrefix: '',
  ...defaults
}

/**
 * Initializes plguin options and other utilities
 */
export function bootstrap ({ pluginOptions, gatsby }: {
  pluginOptions: GatsbyPluginOptions
  gatsby: GatsbyNodeHelpers
}): void {
  // Merge user-defined options with defaults
  options = mergeWith(options, pluginOptions,
    // Ensure arrays aren't merged by index
    (to, from) => isArray(from) ? from : undefined
  )

  // set private options
  options._root = gatsby.store.getState().program.directory
  options._public = path.join(options._root, 'public')
  options._pathPrefix = gatsby.pathPrefix

  // Initialize reporter
  const reporter = gatsby.reporter
  const errorMap: GatsbyReporterErrorMap = {
    10000: {
      text: (context: { message: string }) => {
        return `${options._plugin} threw an error while running:\n ${context.message}`
      },
      level: 'ERROR',
      type: 'PLUGIN'
    }
  }
  if (typeof reporter.setErrorMap === 'function') {
    reporter.setErrorMap(errorMap)
  }

  // Debug final options
  debug('Plugin initialized', options)
}

/**
 * Creates a structured error object to pass to gatsby's reporter
 */
export function createGatsbyError (message: string|Object, error?: Error, code = 10000): GatsbyReporterErrorMeta {
  return {
    id: `${options._plugin}_${code}`,
    context: typeof message === 'object'
      ? message
      : { message },
    error: error instanceof Error
      ? error
      : undefined
  }
}

/**
 * Prints a debug message
 */
export function debug (message: string, ...params: any[]): void {
  createDebug()(message, ...params)
}

/**
 * Creates a debug instance for the given namespace
 *
 * @param {string} namespace
 * @return {Function}
 */
export function createDebug (namespace: string = ''): Function {
  let ns = options._plugin
  if (namespace !== '') {
    ns += ':' + namespace
  }

  const debug = Debug(ns)
  return function (message: string, ...params: any[]) {
    message = params.length > 0
      ? `${message} %O \n\n`
      : `${message} \n\n`
    debug(message, ...params)
  }
}

/**
 * Creates a sha1 hash from a string.
 */
export function sha1 (data: string, base64 = false): string {
  return crypto.createHash('sha1')
    .update(data, 'utf8')
    .digest(base64 ? 'base64' : 'hex')
}

/**
 * Returns the file extension or checks if
 * a file has a given extension
 */
export function extName (file: string, checkExt?: string): string|boolean {
  const ext = path.extname(file).replace('.', '').toLowerCase()
  if (checkExt === undefined) return ext
  return ext === checkExt
}
