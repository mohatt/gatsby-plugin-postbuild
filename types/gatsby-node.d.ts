import type { GatsbyJoi, GatsbyNodeArgs, GatsbyPluginOptions } from './gatsby'
/**
 * Initializes Postbuild and validates user-defined options against
 * the final options schema. Runs before any other node API
 */
export declare function pluginOptionsSchema ({ Joi }: {
  Joi: GatsbyJoi
}): void
/**
 * Triggers Postbuild initial setup and loads user-defined options
 */
export declare function onPreBootstrap (gatsby: GatsbyNodeArgs, pluginOptions: GatsbyPluginOptions): Promise<void>
/**
 * Sets webpack config for the current stage
 */
export declare function onCreateWebpackConfig ({ actions, stage }: GatsbyNodeArgs): void
/**
 * Runs Postbuild on the generated static files
 */
export declare function onPostBuild (gatsby: GatsbyNodeArgs): Promise<void>
