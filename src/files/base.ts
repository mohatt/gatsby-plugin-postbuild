import { Promise } from 'bluebird'
import path from 'path'
import { SUPPORTS } from './index'
import type Postbuild from '../postbuild'
import type { Tasks } from '../tasks'
import type { Filesystem, IFilesystemReportMeta } from '../filesystem'
import type { GatsbyNodeArgs } from '../gatsby'

/**
 * Base class for all file types
 */
export abstract class File<F extends File = File<any>> {
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

  protected readonly fs: Filesystem
  protected readonly emit: Tasks['run']
  protected readonly payload: {
    file: F
    filesystem: Filesystem
    gatsby: GatsbyNodeArgs
  }

  constructor (rel: string, postbuild: Postbuild) {
    this.fs = postbuild.fs
    this.emit = postbuild.tasks.run.bind(postbuild.tasks)
    this.payload = {
      file: this as unknown as F,
      filesystem: this.fs,
      gatsby: postbuild.gatsby as GatsbyNodeArgs
    }

    this.path = path.join(postbuild.fs.root, rel)
    this.extension = this.fs.extension(rel) as string
    this.relative = rel
  }

  /**
   * Creates a new file instance based on the given extension
   */
  static factory = (ext: string, rel: string, postbuild: Postbuild): File => {
    if (!(ext in SUPPORTS)) {
      ext = '*'
    }
    // @ts-expect-error
    return new SUPPORTS[ext](rel, postbuild)
  }

  /**
   * Checks if a file extension is supported
   */
  static supports = (ext: string): boolean => {
    return ext in SUPPORTS
  }

  /**
   * Wraps fs.read by adding file path
   */
  protected doRead (): Promise<string> {
    return this.fs.read(this.relative)
  }

  /**
   * Wraps fs.update by adding file path
   */
  protected doUpdate (data: string): Promise<void> {
    return this.fs.update(this.relative, data, this.reportMeta)
  }

  /**
   * Methods that should be implemented by child
   * classes to load specific file formats
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
