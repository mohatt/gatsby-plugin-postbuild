import type { IFilesystemReportMeta } from '../filesystem'
import type { IExtensionOptions } from '../options'
/**
 * Base class for all file types
 */
export default abstract class File {
  /**
     * Absolute path of the file
     */
  path: string
  /**
     * Path of the file relative to `/public`
     */
  relative: string
  /**
     * File extension
     */
  extension: string
  /**
     * File extension options
     */
  options: IExtensionOptions
  /**
     * Meta fields to be displayed in
     * the file write report
     */
  reportMeta: IFilesystemReportMeta
  /**
     * Checks if a file extension is supported
     */
  static supports: (ext: string) => boolean | typeof File
}
