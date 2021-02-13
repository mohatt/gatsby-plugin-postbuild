import { Promise } from 'bluebird'
import { promises as fs } from 'fs'
import path from 'path'
import _ from 'lodash'
import { HtmlFile } from './html'
import { Purger } from './purger'
import { FileWriter } from './writer'
import { createDebug, options, reporter } from '../../util'

/**
 * Runs purgecss on the html files provided
 *
 * @param {Object} assets Absolute file paths
 * @param   {[string]} assets.html
 */
export default async function ({ html }) {
  const debug = createDebug('purgecss')
  const writer = new FileWriter()
  const purger = new Purger(writer)
  const files = Promise.map(html, filename => {
    const file = new HtmlFile(filename, purger, writer)
    return file.load().then(() => {
      file.loadAssets()
      debug('Loaded html file', _.pick(file, ['path', 'styles', 'scripts']))
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
    // Adds a margin after the last report output
    console.log('')
  }
  reporter.success(`Done purging ${reports.length} files`)
}
