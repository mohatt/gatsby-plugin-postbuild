import { Promise } from 'bluebird'
import { promises as fs } from 'fs'
import path from 'path'
import glob from 'glob'
import filesize from 'filesize'
import { IOptions } from './options'
import { PostbuildError } from '~/common'
const globAsync = Promise.promisify(glob) as typeof glob.__promisify__

/**
 * Helpers for formatting console output
 */
const colorize = {
  title: (text: string) => `\x1b[4m${text}\x1b[0m`,
  tag: (text: string) => `\x1b[3${text === 'create' ? '3' : '2'}m${text}\x1b[0m`,
  file: (text: string) => text,
  size: (text: string) => `\x1b[2m[${text}]\x1b[0m`,
  meta: (key: string, value: string) => `\x1b[2m${key}: ${value}\x1b[0m`
}

/**
 * Formats a file size into a human readable form
 */
const formatSize = filesize.partial({ spacer: '' })

/**
 * Metadata interface for a fs report
 */
export interface IFilesystemReportMeta {
  [field: string]: string
}

/**
 * Represents a file written by the plugin
 */
export class FilesystemReport {
  file: string
  tag: string
  size: [number, number?]
  meta: IFilesystemReportMeta
  constructor (file: string, tag: string, size: [number, number?], meta?: IFilesystemReportMeta) {
    this.file = file
    this.tag = tag
    this.size = size
    this.meta = meta ?? {}
  }

  getConsoleOutput (): string {
    const saved = this.size[1] !== undefined
      ? (((this.size[0] - this.size[1]) / this.size[1]) * 100)
          .toFixed()
          .replace('-0', '0')
      : '0'
    return [
      colorize.tag(this.tag),
      colorize.file(this.file),
      colorize.size(formatSize(this.size[0]) + (saved !== '0' ? ` ${(saved)}%` : '')),
      Object.keys(this.meta)
        .map(field => colorize.meta(field, this.meta[field]))
    ].flat().join(' ')
  }
}

/**
 * Handles file system reports
 */
export class FilesystemReporter {
  /**
   * File write reports
   */
  reports: FilesystemReport[] = []

  /**
   * Total bytes of data saved
   */
  byetsSaved: number = 0

  readonly options: IOptions
  constructor (options: IOptions) {
    this.options = options
  }

  /**
   * Adds a new report and writes it to console if enabled
   */
  add (report: FilesystemReport): void {
    this.reports.push(report)
    if (report.size[1] !== undefined) {
      this.byetsSaved += report.size[0] - report.size[1]
    }
    if (!this.options.consoleReport) {
      return
    }
    if (this.reports.length === 1) {
      console.log(colorize.title('Postbuild report'))
    }
    console.log(' ' + report.getConsoleOutput())
  }

  /**
   * Returns a list of all fs reports
   */
  getReports (tag?: string): FilesystemReport[] {
    if (tag === undefined) return this.reports
    return this.reports.filter(r => r.tag === tag)
  }

  /**
   * Returns the total bytes saved and its formatted form
   */
  getTotalSaved (): [number, string] {
    const saving = this.byetsSaved * -1
    return [
      saving,
      formatSize(saving)
    ]
  }
}

/**
 * Handles reading and writing files
 */
export class Filesystem {
  /**
   * Absolute ath to `/public` directory
   */
  root: string = ''

  /**
   * Gatsby's path prefix for resolving hrefs
   */
  pathPrefix: string = ''

  readonly options: IOptions
  readonly reporter: FilesystemReporter
  constructor (options: IOptions, reporter?: FilesystemReporter) {
    this.options = options
    this.reporter = reporter ?? new FilesystemReporter(options)
  }

  /**
   * Sets root path for `/public` and pathPrefix
   *
   * @param root - Absolute path to `/public`
   * @param pathPrefix - Gatsby's path prefix
   */
  setRoot (root: string, pathPrefix: string = ''): void {
    this.root = root
    this.pathPrefix = pathPrefix
  }

  /**
   * Wraps glob by setting cwd and root paths to /public
   */
  glob (pattern: string, options?: Parameters<typeof glob>[1]): Promise<string[]> {
    return globAsync(pattern, {
      cwd: this.root,
      root: this.root,
      ...options
    })
  }

  /**
   * Reads a file from `/public` directory
   */
  async read (rel: string): Promise<string> {
    try {
      const abs = this.getAbsPath(rel)
      await fs.access(abs)
      return await fs.readFile(abs, 'utf-8')
    } catch (e) {
      throw new PostbuildError(
        `Unable to read file "${rel}": ${String(e.message)}`,
        e
      )
    }
  }

  /**
   * Writes a new file under `/public` directory
   */
  async create (rel: string, data: string, meta?: IFilesystemReportMeta): Promise<void> {
    const abs = this.getAbsPath(rel)
    try {
      await fs.access(path.dirname(abs))
      await fs.writeFile(abs, data)
    } catch (e) {
      throw new PostbuildError(
        `Unable to create file "${rel}": ${String(e.message)}`,
        e
      )
    }
    this.reporter.add(new FilesystemReport(rel, 'create', [Buffer.byteLength(data)], meta))
  }

  /**
   * Updates a file under `/public` directory
   */
  async update (rel: string, data: string, meta?: IFilesystemReportMeta): Promise<void> {
    const abs = this.getAbsPath(rel)
    let size: [number, number]
    try {
      // ensure we're not creating any new files
      await fs.access(abs)
      size = [Buffer.byteLength(data), (await fs.stat(abs)).size]
      await fs.writeFile(abs, data)
    } catch (e) {
      throw new PostbuildError(
        `Unable to update file "${rel}": ${String(e.message)}`,
        e
      )
    }

    this.reporter.add(new FilesystemReport(rel, 'update', size, meta))
    return Promise.resolve()
  }

  /**
   * Returns the file extension or checks if
   * a file has a given extension
   */
  extension (file: string, checkExt?: string): string|boolean {
    const ext = path.extname(file).replace('.', '').toLowerCase()
    if (checkExt === undefined) return ext
    return ext === checkExt
  }

  /**
   * Converts a path relative to `/public` into an absolute one
   */
  getAbsPath (relative: string): string {
    return path.join(this.root, relative)
  }
}
