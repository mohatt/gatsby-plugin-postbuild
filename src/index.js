import path from 'path'
import { promises as fs } from 'fs'
import { defaults, schema } from './options'
import { bootstrap, debug, options, ReporterError } from './util'
import { purgecss } from './tasks'

/**
 * Validates user-defined options against schema.
 * Runs before any other node API
 *
 * @param {Object} Joi
 * @return {Object}
 */
export function pluginOptionsSchema ({ Joi }) {
  return schema(Joi)
}

/**
 * Initializes the plugin.
 *
 * @param {Object} gatsby
 * @param {Object} pluginOptions
 */
export function onPreBootstrap (gatsby, pluginOptions) {
  // Initializes and validates options
  bootstrap({
    gatsby,
    defaultOptions: defaults,
    pluginOptions
  })
}

/**
 * Runs postbuild tasks after build is complete.
 *
 * @param {Object} $0
 * @param {Function} $0.getNodesByType
 * @param {Object} $0.reporter
 * @param {Object} $0.tracing
 * @return {Promise<void>}
 */
export async function onPostBuild ({ getNodesByType, reporter, tracing }) {
  if (!options.enabled) {
    return
  }
  const activity = reporter.activityTimer(options._plugin, {
    parentSpan: tracing.parentSpan
  })
  activity.start()
  const pages = getNodesByType('SitePage')
  const html = []
  for (const page of pages) {
    const filename = path.join(options._public, page.path, 'index.html')
    try {
      await fs.access(filename)
      html.push(filename)
    } catch (e) {} // ignore silently
  }

  try {
    debug('Running purgecss task on', html)
    await purgecss({ html }, activity.setStatus)
  } catch (e) {
    activity.panic(new ReporterError('Error occured while running purgecss', e))
  }
  activity.end()
}
