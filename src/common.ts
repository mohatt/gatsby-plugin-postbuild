import Debug from 'debug'
import type {
  GatsbyReporterErrorMap,
  GatsbyReporterErrorMeta
} from './gatsby'

/**
 * Plugin name
 */
export const PLUGIN = 'gatsby-plugin-postbuild'

/**
 * Core plugin tasks
 */
export const CORE_TASKS = ['purgecss']

/**
 * Reporter error map
 */
export const ERROR_MAP: GatsbyReporterErrorMap = {
  10000: {
    text: (context: { message: string }) => {
      return `${PLUGIN} threw an error while running:\n ${context.message}`
    },
    level: 'ERROR',
    type: 'PLUGIN'
  }
}

/**
 * Creates a structured error object to pass to gatsby's reporter
 */
export function createGatsbyError (error: string|PostbuildError|Error, childErr?: Error): GatsbyReporterErrorMeta {
  let code, context, exception
  if (error instanceof PostbuildError) {
    code = error.code
    context = error.context
    exception = error.getChildErrors().pop()
  } else {
    code = 10000
    context = error
    exception = childErr !== undefined
      ? childErr
      : (error instanceof Error) ? error : undefined
  }

  return {
    id: `${PLUGIN}_${code}`,
    context: typeof context === 'object'
      ? context
      : { message: String(context) },
    error: exception
  }
}

/**
 * Custom error object for handling plugin errors
 */
export class PostbuildError extends Error {
  context: string|Object
  code: number
  childErr?: Error
  constructor (context: string|Object, childErr?: Error, code = 10000) {
    super(typeof context === 'string'
      ? context
      : String(context)
    )
    this.context = context
    this.code = code
    this.childErr = childErr
  }

  getChildErrors (): Error[] {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let instance: Error|PostbuildError = this
    const errors: Error[] = []
    while ('childErr' in instance) {
      if (instance.childErr !== undefined) {
        errors.push(instance.childErr)
        instance = instance.childErr
      }
    }
    return errors
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
  let ns = PLUGIN
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
