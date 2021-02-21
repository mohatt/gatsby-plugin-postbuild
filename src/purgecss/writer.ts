import { promises as fs } from 'fs'
import path from 'path'
import filesize from 'filesize'
import { options, createDebug } from '../util'
const debug = createDebug('purgecss/writer')

/**
 * Represents a file written by the plugin
 * along with some stats
 */
export interface IWriteReport {
  file: string
  sizes: string[]
  rejected?: number
}

/**
 * Handles writing optimized files
 */
export class FileWriter {
  /**
   * Formats a given file size
   */
  formatSize: ((bytes: number) => string)

  /**
   * File write reports
   */
  reports: IWriteReport[] = []

  /**
   * Total bytes of data purged
   */
  saving: number = 0

  /**
   * Creates the filesize format function
   */
  constructor () {
    this.formatSize = filesize.partial({ spacer: '' })
  }

  /**
   * Writes the purged file to disk
   *
   * @param file - File absolute path
   * @param data - File data
   * @param purged - Purged selectors as array
   */
  async write (file: string, data: string, purged: string[]): Promise<void> {
    const sizes = []
    try {
      // ensure we're not creating any new files
      await fs.access(file)
      // Caclulate data lengths
      sizes.push((await fs.stat(file)).size)
      sizes.push(Buffer.byteLength(data))
      sizes.push(sizes[1] - sizes[0])
      this.saving += sizes[2]
      // Write the actual optimized file
      debug('Writing purged file', file)
      await fs.writeFile(file, data)
      // Write purged log if enabled
      if (options.reportRejected) {
        await fs.writeFile(file + '.rejected.log', purged.join(' '))
      }
    } catch (e) {
      throw new Error(`Unable to write purged file "${file}": ${String(e.message)}`)
    }

    const r = {
      file: path.relative(options._public, file),
      sizes: sizes.map(this.formatSize),
      rejected: purged.length
    }
    this.reports.push(r)
    // Ignore reporting to console if disabled
    if (!options.reportConsole) {
      return
    }

    // Write report to console
    console.log(
      (this.reports.length === 1 ? '\n' : '') +
      `\x1b[33m ${r.file}\x1b[0m\x1b[2m` +
      `\n  |- Size: ${r.sizes[0]} -> ${r.sizes[1]} (${r.sizes[2]})` +
      `\n  |- Rejected: ${r.rejected} selector${r.rejected !== 1 ? 's' : ''}` +
      '\x1b[0m\n'
    )
  }

  /**
   * Returns a list of all write reports
   */
  getReports (): IWriteReport[] {
    return this.reports
  }

  /**
   * Returns the total bytes saved and its formatted form
   */
  getTotalSaving (): [number, string] {
    const saving = this.saving * -1
    return [
      saving,
      this.formatSize(saving)
    ]
  }
}
