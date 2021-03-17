import Filesystem from './filesystem'
import { ITaskOptions, File } from './index'
import type { GatsbyNodeArgs } from './gatsby'
/**
 * Interface for the main postbuild object thats is passed
 * to all event callbacks
 */
export declare type IPostbuildArg<O extends ITaskOptions, F extends File | undefined = undefined, P extends Object = {}> = {
  /**
     * Options for current task
     */
  options: O
  /**
     * Reference to current File instance being processed
     */
  file: F
  /**
     * Current event being excuted
     */
  event: {
    type: string
    name: string
  }
  /**
     * Reference to Filesystem instance
     */
  filesystem: Filesystem
  /**
     * Reference to Gatsby node helpers object
     */
  gatsby: GatsbyNodeArgs
} & {
  [K in keyof P]: P[K];
}
