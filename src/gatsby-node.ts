import Postbuild from './postbuild'
import { createPluginExport, PLUGIN, reporter } from './common'
import MinifyTask from './tasks/minify'
import PurgeCssTask from './tasks/purgecss'
import HttpHeadersTask from './tasks/http-headers'

// The main plugin object that handles core functionality
const postbuild = new Postbuild()

// Register core tasks
postbuild.init([MinifyTask, PurgeCssTask, HttpHeadersTask])

// Validates user-defined options against schema (runs before onPluginInit)
export const pluginOptionsSchema = createPluginExport('pluginOptionsSchema', ({ Joi }) => {
  return postbuild.getOptionsSchemas(Joi)
})

// Initializes plugin state
export const onPluginInit = createPluginExport('onPluginInit', async (args, pluginOptions) => {
  args.emitter.on('HTML_GENERATED', (action) => {
    postbuild.setBuildPaths(action.payload)
  })
  await postbuild.bootstrap(args, pluginOptions)
})

// Sets webpack config for the current stage
export const onCreateWebpackConfig = createPluginExport(
  'onCreateWebpackConfig',
  ({ actions, stage }) => {
    actions.setWebpackConfig(postbuild.getWebpackConfig(stage as string))
  },
)

/**
 * Runs Postbuild on the generated static files
 */
export const onPostBuild = createPluginExport('onPostBuild', async (args) => {
  const activity = args.reporter.activityTimer(PLUGIN, {
    // @ts-expect-error
    parentSpan: args.tracing.parentSpan,
  })
  activity.start()
  try {
    // @todo need to check for incremental build before running postbuild
    await postbuild.run(args, activity.setStatus)
  } catch (e) {
    activity.panic(reporter.createError('onPostBuild', e))
  }
  activity.end()
})
