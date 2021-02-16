import { Promise } from 'bluebird'
import { promises as fs } from 'fs'
import path from 'path'
import { HtmlFile } from './html'
import { AssetMapper } from './mapper'
import { Purger } from './purger'
import { FileWriter } from './writer'
import { options } from '../util'

/**
 * Runs purgecss on the html files provided
 *
 * @param {Object} $0
 * @param   {[string]} $0.html - html absolute file paths
 * @param {Function} setStatus - callback to update activity status
 */
export default async function ({ html }, setStatus) {
  if (html.length === 0) return
  const mapper = new AssetMapper()
  const writer = new FileWriter()
  const purger = new Purger(mapper, writer)
  // Exclude ignored pages
  html = html.filter(filename => !mapper.shouldIgnoreFile(filename))
  const status = {
    total: html.length,
    htmlLoaded: 0,
    purgeDone: 0
  }
  setStatus(`Loading ${status.total} html files`)
  const files = await Promise.map(html, filename => {
    const file = new HtmlFile(filename, mapper, purger, writer)
    return file.load().then(() => {
      file.loadAssets()
      status.htmlLoaded++
      setStatus(`Loaded ${status.htmlLoaded}/${status.total}: ${filename}`)
      return file
    })
  })

  setStatus(`Optimizing styles in ${status.total} html files`)
  await Promise.mapSeries(files, file => {
    return file.purgeStyles().then(() => {
      status.purgeDone++
      setStatus(`Optimized ${status.purgeDone}/${status.total}: ${file.path}`)
    })
  })

  // Write the full postbuild report
  const reports = writer.getReports()
  if (options.report) {
    const reportFile = path.join(options._public, 'postbuild.log.json')
    try {
      await fs.writeFile(reportFile, JSON.stringify(reports, null, 2))
    } catch (e) {
      throw new Error(`Unable to write postbuild report file "${reportFile}": ${e.message}`)
    }
  }

  const saving = writer.getTotalSaving()
  setStatus(`Done optimizing ${reports.length} files` + (
    saving[0]
      ? ` saving a total of ${saving[1]}`
      : ''
  ))
}
