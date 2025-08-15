import type { GatsbyNode, Reporter } from 'gatsby'
import Debug from 'debug'

/**
 * Plugin name
 */
export const PLUGIN = 'gatsby-plugin-postbuild'

/**
 * Prints a debug message
 */
export const debug = (message: string, ...params: any[]): void => {
  createDebug()(message, ...params)
}

/**
 * Creates a debug instance for the given namespace
 */
export const createDebug = (namespace = ''): Function => {
  let ns = PLUGIN
  if (namespace !== '') {
    ns += ':' + namespace
  }
  const debug = Debug(ns)
  return (message: string, ...params: any[]) => {
    message = params.length > 0
      ? `${message} %O \n\n`
      : `${message} \n\n`
    debug(message, ...params)
  }
}

/**
 * Manages Gatsby's reporter instance, providing functionalities for structured error logging,
 * warnings, and instance management.
 *
 * @internal
 */
export const reporter = (() => {
  let ref: Reporter | undefined

  // Initializes reporter
  /**
   * Initializes and caches the Gatsby reporter instance.
   *
   * If `setErrorMap` is available, it registers custom error messages
   * for better debugging in Gatsby's CLI.
   */
  const initialize = (instance: Reporter): Reporter => {
    instance.setErrorMap({
      ['1400' satisfies PluginErrorMeta['id']]: {
        text: (context: PluginErrorMeta['context']) => context.message,
        category: 'THIRD_PARTY',
        level: 'ERROR',
        type: 'PLUGIN',
      },
    })

    ref = instance
    return instance
  }

  /**
   * Retrieves the cached reporter instance.
   */
  const get = (): Reporter => {
    return ref
  }

  const createError = (api: keyof GatsbyNode, err: string | PluginError | Error): PluginErrorMeta => {
    const prefix = `The plugin threw an error during "${api}" hook`

    let title: string | undefined
    let mainError: Error | undefined

    if (err instanceof PluginError) {
      title = err.message
      mainError = err.originalError
    } else if (err instanceof Error) {
      mainError = err
    } else {
      title = err
    }

    return {
      id: '1400',
      context: {
        message: mainError && title ? `${prefix}:\n ${title}` : prefix,
      },
      error: mainError ?? (title ? new Error(title) : undefined),
    }
  }

  /**
   * Logs an error and terminates the build process.
   *
   * - Uses Gatsby's `panic()` method to log structured errors.
   * - If an `Error` object is provided, includes it in the error report.
   * - Otherwise, creates a new error instance from the given message.
   *
   * @param api The Gatsby Node API that caused the error.
   * @param err The error message or PluginError object to display.
   *
   * @throws - This function never returns; it always terminates execution.
   */
  const error = (api: keyof GatsbyNode, err: string | PluginError | Error): never => {
    const meta = createError(api, err)
    if (!ref) {
      throw err
    }
    return ref.panic(meta)
  }

  /**
   * Logs a warning message in the Gatsby CLI.
   *
   * @param message The warning message to display.
   */
  const warning = (message: string): void => {
    const prefix = `"${PLUGIN}" might not be working properly`
    const warning = `${prefix}:\n ${message}`
    if (!ref) {
      throw new Error(warning)
    }
    ref.warn(warning)
  }

  return { initialize, get, error, createError, warning }
})()

/**
 * Wraps a Gatsby API function with error handling.
 *
 * @param api - The name of the Gatsby API being wrapped (e.g., `"onCreatePage"`).
 * @param fn - The original Gatsby API function to be wrapped.
 *
 * @returns The wrapped function with error handling.
 */
export const createPluginExport = <T extends keyof GatsbyNode, F extends GatsbyNode[T]>(
  api: T,
  fn: F,
): F => {
  return ((...args: any[]) => {
    try {
      // Call the original function with provided arguments
      const result = (fn as any)(...args)

      // If the function returns a Promise, attach error handling
      if (result instanceof Promise) {
        return result.catch((error) => reporter.error(api, error))
      }

      // Return the result (for synchronous functions)
      return result
    } catch (error) {
      // Catch synchronous errors and report them
      reporter.error(api, error)
    }
  }) as F
}

/**
 * The main plugin error representation in Gatsby's error map.
 */
export interface PluginErrorMeta {
  id: '1400'
  context: {
    message: string
  }
  error: Error
}

/**
 * Custom error class for plugin-related errors.
 */
export class PluginError extends Error {
  /**
   * @param message - A description of the error.
   * @param originalError - The original error that caused this issue (optional).
   */
  constructor(
    message: string,
    public readonly originalError?: Error,
  ) {
    super(message)
  }
}
