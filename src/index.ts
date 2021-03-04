import { Postbuild } from './postbuild'
import { createGatsbyError, PLUGIN } from './common'
import type {
  GatsbyJoi,
  GatsbyNodeArgs,
  GatsbyPluginOptions
} from './gatsby'

/**
 * The main plugin object that handles core plugin functionality
 */
const postbuild = new Postbuild()

/**
 * Validates user-defined options against schema
 * Runs before any other node API
 */
export function pluginOptionsSchema ({ Joi }: { Joi: GatsbyJoi }): void {
  try {
    postbuild.initTasks()
    return postbuild.getOptionsSchemas(Joi)
  } catch (e) {
    throw new Error(
      `Error occured while initializing "${PLUGIN}" plugin: ${String(e.message)}`
    )
  }
}

/**
 * Initializes the plugin
 */
export async function onPreBootstrap (
  gatsby: GatsbyNodeArgs,
  pluginOptions: GatsbyPluginOptions
): Promise<void> {
  try {
    await postbuild.bootstrap(gatsby, pluginOptions)
  } catch (e) {
    gatsby.reporter.panic(createGatsbyError(e))
  }
}

/**
 * Runs postbuild after build is complete
 */
export async function onPostBuild (gatsby: GatsbyNodeArgs): Promise<void> {
  const activity = gatsby.reporter.activityTimer(PLUGIN, {
    // @ts-expect-error
    parentSpan: gatsby.tracing.parentSpan
  })
  activity.start()
  try {
    await postbuild.run(gatsby, activity.setStatus)
    await postbuild.shutdown(gatsby)
  } catch (e) {
    activity.panic(createGatsbyError(e))
  }
  activity.end()
}
