import type { IExtensionOptions } from '@postbuild/interfaces'
import File, { FileConstructorArgs } from './base'
import FileGeneric from './generic'
import FileHtml from './html'

/**
 * @internal
 */
class FileType {
  static types: { [ext: string]: typeof File } = {
    '*': FileGeneric,
    html: FileHtml
  }

  /**
   * Creates a new file instance for the given path based on the given extension
   * @internal
   */
  static factory = (ext: string, rel: string, options: IExtensionOptions, args: FileConstructorArgs): File => {
    if (!(ext in this.types)) {
      ext = '*'
    }
    // @ts-expect-error
    return new this.types[ext](rel, options, args)
  }

  /**
   * Checks if a file extension is supported
   */
  static supports = (ext: string): boolean|typeof File => {
    return ext in this.types ? this.types[ext] : false
  }
}

export default FileType
