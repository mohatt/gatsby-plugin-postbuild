import glob from 'glob'
import { getOption, initializeOptions, initializeReporter } from './util'
import { defaults, schema } from './options'
import tasks from './tasks'

/**
 * Validates user-defined options against schema.
 * Runs before any other node API
 *
 * @param {Object} Joi
 * @return {Object}
 */
export function pluginOptionsSchema ({ Joi }) {
  const taskSchemas = tasks.getFields('options.schema')
  Object.keys(taskSchemas).forEach(function (t) {
    taskSchemas[t] = taskSchemas[t](Joi)
  })

  return schema(Joi, taskSchemas)
}

/**
 * Initializes the plugin.
 *
 * @param {Object} args
 * @param {Object} pluginOptions
 */
export function onPreBootstrap (args, pluginOptions) {
  initializeReporter(args.reporter)
  const defaultOptions = {
    ...defaults,
    ...tasks.getFields('options.defaults')
  }
  // Initializes and validates options
  initializeOptions({
    gatsby: args,
    defaultOptions,
    pluginOptions
  })
}

/**
 * Run plugin tasks after build is complete.
 *
 * @param {Object} args
 * @return {Promise<void>}
 */
export async function onPostBuild (args) {
  const build = getOption('_public')
  const assets = {
    html: '**/*.html',
    js: '**/*.js',
    css: '**/*.css'
  }

  Object.keys(assets).forEach(function (a) {
    assets[a] = glob.sync(`${build}/${assets[a]}`, { nodir: true })
  })

  // Invoke tasks' "run" api
  await tasks.run({
    api: 'run',
    params: { assets },
    gatsby: args
  })
}
