import { Promise } from 'bluebird'
import File from './base'

/**
 * Handles files with unknown extensions
 */
export default class FileGeneric extends File {
  /**
   * Reads and writes the file in one mthod since there
   * is no need to retain the file data
   *
   * @internal
   */
  read (): Promise<void> {
    return this.file.read()
      .then(raw => this.emit('unknown', 'content', {
        ...this.emitPayload<FileGeneric>(),
        raw
      }, 'raw'))
      .then(data => this.file.update(data))
  }

  /**
   * Dummy method
   *
   * @internal
   */
  process (): Promise<void> {
    return Promise.resolve()
  }

  /**
   * Dummy method
   *
   * @internal
   */
  write (): Promise<void> {
    return Promise.resolve()
  }
}
