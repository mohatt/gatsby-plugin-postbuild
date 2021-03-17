import { Promise } from 'bluebird'
import path from 'path'
import { SUPPORTS } from './index'
import type Tasks from '../tasks'
import type { Filesystem, IFilesystemReportMeta } from '../filesystem'
import type { GatsbyNodeArgs } from '../gatsby'

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
    gatsby: GatsbyNodeArgs
  }

  /**
   * Sets the file metadata and other private methods
   * needed for processing the file by child classes
   * @internal
   */
  constructor (rel: string, fs: Filesystem, tasks: Tasks, gatsby: GatsbyNodeArgs) {
    this.path = path.join(fs.root, rel)
    this.relative = rel
    this.extension = fs.extension(rel) as string

    this.file = {
      read: () => fs.read(rel),
      update: (data) => fs.update(rel, data, this.reportMeta)
    }

    this.emit = tasks.run.bind(tasks)
    const payload = {
      file: this as any,
      filesystem: fs,
      gatsby
    }
    this.emitPayload = () => payload
  }

  /**
   * Creates a new file instance for the given path based on the given extension
   * @internal
   */
  static factory = (ext: string, rel: string, fs: Filesystem, tasks: Tasks, gatsby: GatsbyNodeArgs): File => {
    if (!(ext in SUPPORTS)) {
      ext = '*'
    }
    // @ts-expect-error
    return new SUPPORTS[ext](rel, fs, tasks, gatsby)
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
