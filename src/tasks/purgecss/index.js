import { Promise } from 'bluebird'
import { promises as fs } from 'fs'
import path from 'path'
import { HtmlFile } from './html'
import { Purger } from './purger'
import { FileWriter } from './writer'
import { options, reporter } from '../../util'

/**
 * Runs purgecss on the html files provided
 *
 * @param {Object} $0
 * @param   {[string]} $0.html - html absolute file paths
 */
export default async function ({ html }) {
  if (html.length === 0) return
  const writer = new FileWriter()
  const purger = new Purger(writer)
  const files = Promise.map(html, filename => {
    const file = new HtmlFile(filename, purger, writer)
    return file.load().then(() => {
      file.loadAssets()
      return file
    })
  })

  await files.mapSeries(file => {
    return file.purgeStyles()
  })

  // Write the full postbuild report
  const reports = writer.getReports()
  if (options.report) {
    const reportFile = path.join(options._public, 'postbuild.log.json')
    try {
      await fs.writeFile(reportFile, JSON.stringify(reports, null, 2))
    } catch (e) {
      throw new Error(`Unable to write postbuild report file "${reportFile}"`)
    }
  }

  // Write success message
  if (options.reportConsole) {
    console.log('') // Adds a margin after the last report output
  }
  const saving = writer.getTotalSaving()
  reporter.success(`Done optimizing ${reports.length} files` + (
    saving[0]
      ? ` saving a total of ${saving[1]}`
      : ''
  ))
}
