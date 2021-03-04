import { Promise } from 'bluebird'
import { File } from './base'

/**
 * Handles files not known to the plugin
 */
export class FileGeneric extends File {
  /**
   * Raw file contents as string
   */
  data: string = ''

  /**
   * @inheritDoc
   */
  read (): Promise<void> {
    return this.doRead()
      .then(data => this.postbuild.tasks.run('file', 'read', {
        ...this.getEventPayload(),
        data
      }, 'data'))
      .then(data => {
        this.data = data
      })
  }

  /**
   * @inheritDoc
   */
  process (): Promise<void> {
    return Promise.resolve()
  }

  /**
   * @inheritDoc
   */
  write (): Promise<void> {
    return this.postbuild.tasks.run('file', 'write', {
      ...this.getEventPayload(),
      data: this.data
    }, 'data')
      .then(data => this.doUpdate(data))
  }
}
