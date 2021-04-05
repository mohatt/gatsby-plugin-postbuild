import type { ITaskApiEvents, ITaskOptions } from './index'
export declare type IOptionProcessingStrategy = 'sequential' | 'parallel'
export interface IOptionProcessing {
  concurrency: number
  strategy: IOptionProcessingStrategy
}
export declare type IExtensionOptions<O = {
  [option: string]: any
}> = IOptionProcessing & O
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
    [ext: string]: Partial<IExtensionOptions>
  }
} & {
  [task: string]: ITaskOptions
}
export default IOptions
