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
    message = params.length > 0 ? `${message} %O \n\n` : `${message} \n\n`
    debug(message, ...params)
  }
}

/**
 * Manages Gatsby's reporter instance, providing structured logging,
 * error handling, and lifecycle management for plugin diagnostics.
 * @internal
 */
export class PluginReporter {
  private _ref?: Reporter

  /**
   * Initializes and caches the Gatsby reporter instance.
   *
   * If `setErrorMap` is available, registers custom error messages
   * for better debugging in Gatsby's CLI.
   */
  initialize(instance: Reporter) {
    instance.setErrorMap?.({
      ['1400' satisfies IErrorMeta['id']]: {
        text: (context: IErrorMeta['context']) => context.message,
        category: 'THIRD_PARTY',
        level: 'ERROR',
        type: 'PLUGIN',
      },
    })

    this._ref = instance
  }

  /**
   * Retrieves the cached reporter instance.
   * Throws if called before initialization.
   */
  get ref() {
    if (!this._ref) {
      throw new Error(`[${PLUGIN}] Reporter not initialized`)
    }
    return this._ref
  }

  /**
   * Builds a structured error meta object for Gatsby.
   */
  createError(api: keyof GatsbyNode, err: string | PluginError | Error): IErrorMeta {
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
   * Uses Gatsby's `panic()` to log structured errors.
   * Throws if reporter not initialized.
   */
  error(api: keyof GatsbyNode, err: string | PluginError | Error): never {
    const meta = this.createError(api, err)
    const reporter = this._ref
    if (!reporter) throw err
    return reporter.panic(meta)
  }

  /**
   * Logs a warning message in the Gatsby CLI.
   */
  warning(message: string) {
    const prefix = `"${PLUGIN}" might not be working properly`
    const warning = `${prefix}:\n ${message}`
    const reporter = this._ref
    if (!reporter) throw new Error(warning)
    reporter.warn(warning)
  }

  /**
   * Logs an info message in the Gatsby CLI.
   */
  info(message: string) {
    this._ref?.info(`[${PLUGIN}]: ${message}`)
  }

  /**
   * Logs a verbose message in the Gatsby CLI.
   */
  verbose(message: string) {
    this._ref?.verbose(`[${PLUGIN}]: ${message}`)
  }
}

// Singleton reporter style
export const reporter = new PluginReporter()

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
export interface IErrorMeta {
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
