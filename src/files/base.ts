import { Promise } from 'bluebird'
import path from 'path'
import { SUPPORTS } from './index'
import { Postbuild } from '../postbuild'
import { Tasks } from '../tasks'
import { Filesystem } from '../filesystem'
import { GatsbyNodeArgs } from '../gatsby'

/**
 * Base class for all file types
 */
export abstract class File {
  /**
   * Absolute path of the file
   */
  path: string

  /**
   * Path of the file relative to `public/`
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
  reportMeta: {
    [p: string]: string
  } = {}

  protected readonly postbuild: Postbuild
  protected readonly tasks: Tasks
  constructor (rel: string, postbuild: Postbuild) {
    this.postbuild = postbuild
    this.tasks = postbuild.tasks
    this.path = path.join(postbuild.fs.root, rel)
    this.extension = postbuild.fs.extension(rel) as string
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
   * Returns an object to be passed to event callbacks
   */
  getEventPayload<F extends File> (): {
    file: F
    filesystem: Filesystem
    gatsby: GatsbyNodeArgs
  } {
    return {
      file: this as unknown as F,
      filesystem: this.postbuild.fs,
      gatsby: this.postbuild.gatsby as GatsbyNodeArgs
    }
  }

  /**
   * Wraps fs.read by adding file path
   */
  protected doRead (): Promise<string> {
    return this.postbuild.fs.read(this.relative)
  }

  /**
   * Wraps fs.update by adding file path
   */
  protected doUpdate (data: string): Promise<void> {
    return this.postbuild.fs.update(this.relative, data, this.reportMeta)
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
