import { promises as fs } from 'fs'
import path from 'path'
import filesize from 'filesize'
import { options } from '../../util'

export class FileWriter {
  formatSize
  reports = []
  saving = 0

  constructor () {
    this.formatSize = filesize.partial({ spacer: '' })
  }

  /**
   * Writes the purged asset file on disk
   *
   * @param {string} file - File absolute path
   * @param {string} data - File data
   * @param {([string]|null)} purged - Purged selectors as array to write a rejected
   *  log file next to the main asset file, otherwise nothing will be written
   * @return {Object} - A summary report to be printed
   */
  async write (file, data, purged) {
    const sizes = []
    const rejected = Array.isArray(purged)
    try {
      await fs.access(file)
      // Caclulate data lengths
      sizes.push((await fs.stat(file)).size)
      sizes.push(Buffer.byteLength(data))
      sizes.push(sizes[1] - sizes[0])
      this.saving += sizes[2]
      // Write the actual file
      await fs.writeFile(file, data)
      // Write purged log if enabled
      if (rejected) {
        await fs.writeFile(file + '.rejected.log', purged.join(' '))
      }
    } catch (e) {
      throw new Error(`Unable to write purged file "${file}": ${e.message}`)
    }

    const r = {
      file: path.relative(options._public, file),
      sizes: sizes.map(this.formatSize),
      rejected: rejected ? purged.length : undefined
    }
    this.reports.push(r)
    // Ignore reporting to console if specified
    if (!options.reportConsole) {
      return
    }

    // Write report to console
    console.log(`\x1b[33m
 ${r.file}\x1b[0m\x1b[2m
  |- Size: ${r.sizes[0]} -> ${r.sizes[1]} (${r.sizes[2]})` +
      (rejected
        ? `
  |- Rejected: ${r.rejected} selector${r.rejected !== 1 ? 's' : ''}`
        : '') +
      '\x1b[0m')
  }

  getReports () {
    return this.reports
  }

  getTotalSaving () {
    const saving = this.saving * -1
    return [
      saving,
      this.formatSize(saving)
    ]
  }
}
