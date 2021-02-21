import type { NodePluginArgs, IPluginRefOptions, Reporter } from 'gatsby'

export type GatsbyReporter = Reporter
export type GatsbyJoi = any
export type GatsbyPluginOptions = IPluginRefOptions
export interface GatsbyNodeHelpers extends NodePluginArgs {
  Joi?: GatsbyJoi
}
export type GatsbyReporterErrorMeta = Parameters<GatsbyReporter['error']>[0]
export interface GatsbyReporterErrorMap {
  [code: string]: GatsbyReporter['errorMap'][string]
}
