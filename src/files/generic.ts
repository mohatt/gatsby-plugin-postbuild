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
  async read() {
    const raw = await this.file.read()
    const payload = this.emitPayload<FileGeneric>()
    const data = await this.emit('unknown', 'content', { ...payload, raw }, 'raw')
    await this.file.update(data)
  }

  /**
   * Dummy method
   *
   * @internal
   */
  async process() {
    // no-op: generic files are handled during read/write
  }

  /**
   * Dummy method
   *
   * @internal
   */
  async write() {
    // no-op: updates happen during read()
  }
}
