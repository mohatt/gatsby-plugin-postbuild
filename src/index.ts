import Postbuild from './postbuild'
import { createGatsbyError, CORE_TASKS, PLUGIN } from './common'
import type {
  GatsbyJoi,
  GatsbyNodeArgs,
  GatsbyPluginOptions
} from './gatsby'

/**
 * The main plugin object that handles core functionalities
 */
const postbuild = new Postbuild()

/**
 * Initializes Postbuild and validates user-defined
 * options against the final options schema
 * Runs before any other node API
 */
export function pluginOptionsSchema ({ Joi }: { Joi: GatsbyJoi }): void {
  try {
    postbuild.init(CORE_TASKS)
    return postbuild.getOptionsSchemas(Joi)
  } catch (e) {
    throw new Error(
      `Error occured while initializing "${PLUGIN}" plugin: ${String(e.message)}`
    )
  }
}

/**
 * Triggers Postbuild initial setup and loads user-defined options
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
 * Runs Postbuild on the generated files under `/public`
 */
export async function onPostBuild (gatsby: GatsbyNodeArgs): Promise<void> {
  const activity = gatsby.reporter.activityTimer(PLUGIN, {
    // @ts-expect-error
    parentSpan: gatsby.tracing.parentSpan
  })
  activity.start()
  try {
    await postbuild.run(gatsby, activity.setStatus)
  } catch (e) {
    activity.panic(createGatsbyError(e))
  }
  activity.end()
}
