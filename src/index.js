import glob from 'glob'
import { bootstrap, options, reporter } from './util'
import { defaults, schema } from './options'
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
 * Run plugin tasks after build is complete.
 *
 * @param {Object} gatsby
 * @return {Promise<void>}
 */
export async function onPostBuild (gatsby) {
  if (!options.enabled) {
    return
  }

  const build = options._public
  const assets = {
    html: '**/*.html',
    js: '**/*.js',
    css: '**/*.css'
  }

  Object.keys(assets).forEach(function (a) {
    assets[a] = glob.sync(`${build}/${assets[a]}`, { nodir: true })
  })

  try {
    await purgecss({ assets })
  } catch (e) {
    reporter.error(`Error occured while running purgecss`, e)
  }
}
