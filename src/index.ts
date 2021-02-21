import path from 'path'
import { promises as fs } from 'fs'
import { schema } from './options'
import { bootstrap, debug, options, createGatsbyError } from './util'
import purgecss from './purgecss'
import { GatsbyNodeHelpers, GatsbyPluginOptions } from './gatsby'

/**
 * Validates user-defined options against schema.
 * Runs before any other node API
 */
export function pluginOptionsSchema ({ Joi }: GatsbyNodeHelpers): void {
  return schema(Joi)
}

/**
 * Initializes the plugin
 */
export function onPreBootstrap (gatsby: GatsbyNodeHelpers, pluginOptions: GatsbyPluginOptions): void {
  bootstrap({ gatsby, pluginOptions })
}

/**
 * Runs postbuild after build is complete
 */
export async function onPostBuild ({ getNodesByType, reporter, tracing }: GatsbyNodeHelpers): Promise<void> {
  if (!options.enabled) {
    return
  }

  const activity = reporter.activityTimer(options._plugin, {
    // @ts-expect-error
    parentSpan: tracing.parentSpan
  })
  activity.start()
  const pages = getNodesByType('SitePage')
  const html = []
  for (const page of pages) {
    const filename = path.join(options._public, page.path as string, 'index.html')
    try {
      await fs.access(filename)
      html.push(filename)
    } catch (e) {} // ignore silently
  }

  try {
    debug('Running purgecss on', html)
    await purgecss({ html }, activity.setStatus)
  } catch (e) {
    activity.panic(createGatsbyError('Error occured while running purgecss', e))
  }
  activity.end()
}
