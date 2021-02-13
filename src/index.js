import path from 'path'
import { promises as fs } from 'fs'
import { bootstrap, debug, reporter, options } from './util'
import { defaults, schema } from './options'

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
 * Run plugin tasks after build is complete.
 *
 * @param {Object} $0
 * @param {Function} $0.getNodesByType
 * @return {Promise<void>}
 */
export async function onPostBuild ({ getNodesByType }) {
  if (!options.enabled) {
    return
  }
  const pages = getNodesByType('SitePage')
  const html = []
  for (const page of pages) {
    const filename = path.join(options._public, page.path, 'index.html')
    try {
      await fs.access(filename)
      html.push(filename)
    } catch (e) {} // ignore silently
  }

  const tasks = require('./tasks')
  try {
    debug('Running purgecss task on', html)
    await tasks.purgecss({ html })
  } catch (e) {
    reporter.error('Error occured while running purgecss', e)
  }
}
