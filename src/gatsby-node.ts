import type { PluginOptions } from 'gatsby'
import type { IUserOptions } from './interfaces'
import Postbuild from './postbuild'
import { createPluginExport, reporter } from './common'
import MinifyTask from './tasks/minify'
import HttpHeadersTask from './tasks/http-headers'

// The main plugin object that handles core functionality
const postbuild = new Postbuild(reporter)

// Register core tasks
postbuild.init([MinifyTask, HttpHeadersTask])

// Validates user-defined options against schema (runs before onPluginInit)
export const pluginOptionsSchema = createPluginExport('pluginOptionsSchema', ({ Joi }) => {
  return postbuild.getOptionsSchemas(Joi)
})

// Initializes plugin state
export const onPluginInit = createPluginExport(
  'onPluginInit',
  async (args, pluginOptions: PluginOptions & IUserOptions) => {
    await postbuild.bootstrap(args, pluginOptions)
    // Subscribe to HTML generation events
    args.emitter.on('HTML_GENERATED', (action) => {
      postbuild.setBuildPaths(action.payload)
    })
  },
)

// Sets webpack config for the current stage
export const onCreateWebpackConfig = createPluginExport(
  'onCreateWebpackConfig',
  ({ actions, stage }) => {
    actions.setWebpackConfig(postbuild.getWebpackConfig(stage))
  },
)

/**
 * Runs Postbuild on the generated static files
 */
export const onPostBuild = createPluginExport('onPostBuild', async (args) => {
  await postbuild.run(args)
})
