import type { NodePluginArgs, IPluginRefOptions, Reporter } from 'gatsby'

export type GatsbyJoi = any
export type GatsbyPluginOptions = IPluginRefOptions
export type GatsbyNodeArgs = NodePluginArgs
/** @internal */
export type GatsbyReporter = Reporter
/** @internal */
export type GatsbyReporterErrorMeta = Parameters<GatsbyReporter['error']>[0]
/** @internal */
export interface GatsbyReporterErrorMap {
  [code: string]: GatsbyReporter['errorMap'][string]
}
