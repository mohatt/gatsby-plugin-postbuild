import { Promise } from 'bluebird'
import { File } from './base'

/**
 * Handles files not known to the plugin
 */
export class FileGeneric extends File {
  /**
   * Reads and writes the file in one mthod since there
   * is no need to retain the file data
   */
  read (): Promise<void> {
    return this.file.read()
      .then(raw => this.emit('glob', 'content', {
        ...this.emitPayload<FileGeneric>(),
        raw
      }, 'raw'))
      .then(data => this.file.update(data))
  }

  /**
   * Dummy method
   */
  process (): Promise<void> {
    return Promise.resolve()
  }

  /**
   * Dummy method
   */
  write (): Promise<void> {
    return Promise.resolve()
  }
}
