import { Promise } from 'bluebird'
import path from 'path'
import { SUPPORTS } from './index'
import type { Tasks } from '../tasks'
import type { Filesystem, IFilesystemReportMeta } from '../filesystem'
import type { GatsbyNodeArgs } from '../gatsby'

/**
 * Base class for all file types
 */
export abstract class File {
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
   */
  protected readonly file: {
    read: () => Promise<string>
    update: (data: string) => Promise<void>
  }

  /**
   * Wraps tasks.run method
   */
  protected readonly emit: Tasks['run']
  protected readonly emitPayload: <F extends File>() => {
    file: F
    filesystem: Filesystem
    gatsby: GatsbyNodeArgs
  }

  /**
   * Sets the file metadata and other private methods
   * needed for processing the file by child classes
   * @constructor
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
  static supports = (ext: string): boolean => {
    return ext in SUPPORTS
  }

  /**
   * Methods that should be implemented by child
   * classes to process specific file formats
   */

  /**
   * Reads the file contents
   */
  abstract read (): Promise<void>

  /**
   * Performs transformations on the file contents
   */
  abstract process (): Promise<void>

  /**
   * Writes the processed file contents
   */
  abstract write (): Promise<void>
}
