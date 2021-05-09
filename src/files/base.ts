import { Promise } from 'bluebird'
import path from 'path'
import { SUPPORTS } from './index'
import type Tasks from '../tasks'
import type { IAssetsManifest } from '../postbuild'
import type { Filesystem, IFilesystemReportMeta } from '../filesystem'
import type { IExtensionOptions } from '../options'
import type { GatsbyNodeArgs } from '../gatsby'

/** @internal */
export interface FileConstructorArgs {
  filesystem: Filesystem
  tasks: Tasks
  assets: IAssetsManifest
  gatsby: GatsbyNodeArgs
}

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
  reportMeta: IFilesystemReportMeta = {}

  /**
   * Wraps fs methods by adding file path
   * @internal
   */
  protected readonly file: {
    read: () => Promise<string>
    update: (data: string) => Promise<void>
  }

  /**
   * Wraps tasks.run method
   * @internal
   */
  protected readonly emit: Tasks['run']
  /** @internal */
  protected readonly emitPayload: <F extends File>() => {
    file: F
    filesystem: Filesystem
    assets: IAssetsManifest
    gatsby: GatsbyNodeArgs
  }

  /**
   * Sets the file metadata and other private methods
   * needed for processing the file by child classes
   * @internal
   */
  constructor (rel: string, options: IExtensionOptions, { filesystem, tasks, assets, gatsby }: FileConstructorArgs) {
    this.path = path.join(filesystem.root, rel)
    this.relative = rel
    this.extension = filesystem.extension(rel) as string

    this.file = {
      read: () => filesystem.read(rel),
      update: (data) => filesystem.update(rel, data, this.reportMeta)
    }

    this.options = options
    this.emit = tasks.run.bind(tasks)
    const payload = {
      file: this as any,
      assets,
      filesystem,
      gatsby
    }
    this.emitPayload = () => payload
  }

  /**
   * Creates a new file instance for the given path based on the given extension
   * @internal
   */
  static factory = (ext: string, rel: string, options: IExtensionOptions, args: FileConstructorArgs): File => {
    if (!(ext in SUPPORTS)) {
      ext = '*'
    }
    // @ts-expect-error
    return new SUPPORTS[ext](rel, options, args)
  }

  /**
   * Checks if a file extension is supported
   */
  static supports = (ext: string): boolean|typeof File => {
    return ext in SUPPORTS ? SUPPORTS[ext] : false
  }

  /**
   * Methods that should be implemented by child
   * classes to process specific file formats
   */

  /**
   * Reads the file contents
   * @internal
   */
  abstract read (): Promise<void>

  /**
   * Performs transformations on the file contents
   * @internal
   */
  abstract process (): Promise<void>

  /**
   * Writes the processed file contents
   * @internal
   */
  abstract write (): Promise<void>
}
