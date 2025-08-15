import { Promise } from 'bluebird'
import { promises as fs } from 'fs'
import path from 'path'
import glob, { IOptions as IGlobOptions } from 'glob'
import chalk from 'chalk'
import filesize from 'filesize'
import { toInteger } from 'lodash'
import { PluginError } from './common'
import type { IOptions } from './interfaces'
const globAsync = Promise.promisify(glob) as typeof glob.__promisify__

/**
 * Helpers for formatting console output
 */
const colorize = {
  title: (text: string) => chalk.underline(text),
  tag: (text: string) => chalk[text === 'create' ? 'yellow' : 'green'](text),
  file: (text: string) => text,
  size: (text: string) => chalk.dim(`[${text}]`),
  meta: (key: string, value: string) => chalk.dim(`${key}: ${value}`)
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
 * @internal
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
      ? toInteger(((this.size[0] - this.size[1]) / this.size[1]) * 100)
      : 0
    return [
      colorize.tag(this.tag),
      colorize.file(this.file),
      colorize.size(formatSize(this.size[0]) + (saved !== 0 ? ` ${(saved)}%` : '')),
      Object.keys(this.meta).map(field => colorize.meta(field, this.meta[field]))
    ].flat().join(' ')
  }
}

/**
 * Handles fs reports
 * @internal
 */
export class FilesystemReporter {
  private readonly reports: FilesystemReport[] = []
  private byetsSaved: number = 0
  private readonly options: IOptions
  constructor (options: IOptions) {
    this.options = options
  }

  /**
   * Adds a new report and prints a summary to console if enabled
   */
  add (report: FilesystemReport): void {
    this.reports.push(report)
    if (report.size[1] !== undefined) {
      this.byetsSaved += report.size[0] - report.size[1]
    }
    const { reporting } = this.options
    if (reporting === false || (typeof reporting === 'object' && !reporting.console)) return
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
    const saved = this.byetsSaved * -1
    return [saved, formatSize(saved)]
  }
}

/**
 * Handles reading and writing files
 */
export class Filesystem {
  /**
   * Absolute path to `/public` to be used for resolving relative paths
   * @internal
   */
  root: string = ''

  /** @internal */
  private readonly options: IOptions

  /** @internal */
  readonly reporter: FilesystemReporter

  /** @internal */
  constructor (options: IOptions, reporter?: FilesystemReporter) {
    this.options = options
    this.reporter = reporter ?? new FilesystemReporter(options)
  }

  /**
   * Sets root path
   *
   * @internal
   */
  setRoot (root: string): void {
    this.root = root
  }

  /**
   * Wraps glob by setting cwd and root paths to `/public` directory
   */
  glob (pattern: string, options?: IGlobOptions): Promise<string[]> {
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
      const abs = this.getPublicPath(rel)
      await fs.access(abs)
      return await fs.readFile(abs, 'utf-8')
    } catch (e) {
      throw new PluginError(
        `Unable to read file "${rel}": ${String(e.message)}`,
        e
      )
    }
  }

  /**
   * Writes a new file under `/public` directory
   */
  async create (rel: string, data: string, meta?: IFilesystemReportMeta): Promise<void> {
    const abs = this.getPublicPath(rel)
    try {
      await fs.access(path.dirname(abs))
      await fs.writeFile(abs, data)
    } catch (e) {
      throw new PluginError(
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
    const abs = this.getPublicPath(rel)
    let size: [number, number]
    try {
      // ensure we're not creating any new files
      await fs.access(abs)
      size = [Buffer.byteLength(data), (await fs.stat(abs)).size]
      await fs.writeFile(abs, data)
    } catch (e) {
      throw new PluginError(
        `Unable to update file "${rel}": ${String(e.message)}`,
        e
      )
    }
    this.reporter.add(new FilesystemReport(rel, 'update', size, meta))
    return Promise.resolve()
  }

  /**
   * Returns the file extension or checks if a file has a given extension
   */
  extension (file: string, checkExt?: string|string[]): string|boolean {
    const ext = path.extname(file).replace('.', '').toLowerCase()
    if (checkExt === undefined) return ext
    return typeof checkExt === 'string'
      ? ext === checkExt
      : checkExt.includes(ext)
  }

  /**
   * Converts a path relative to `/public` into an absolute one
   */
  getPublicPath (relative: string): string {
    return path.join(this.root, relative)
  }
}

export default Filesystem
export type { IGlobOptions }
