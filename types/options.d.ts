import type { ITaskApiEvents, ITaskOptions } from './index'
export declare type IOptionProcessingStrategy = 'sequential' | 'parallel'
export interface IOptionProcessing {
  concurrency: number
  strategy: IOptionProcessingStrategy
}
/**
 * Plugin options interface
 */
export declare type IOptions = {
  enabled: boolean
  reporting: {
    log: boolean
    console: boolean
  } | boolean
  ignore: string[]
  events: ITaskApiEvents<any>
  processing: IOptionProcessing
  extensions: {
    [ext: string]: Partial<IOptionProcessing> | undefined
  }
} & {
  [task: string]: ITaskOptions
}
export default IOptions
