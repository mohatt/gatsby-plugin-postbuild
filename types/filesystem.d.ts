import { IOptions as IGlobOptions } from 'glob'
/**
 * Metadata interface for a fs report
 */
export interface IFilesystemReportMeta {
  [field: string]: string
}
/**
 * Handles reading and writing files
 */
export declare class Filesystem {
  /**
     * Wraps glob by setting cwd and root paths to `/public` directory
     */
  glob (pattern: string, options?: IGlobOptions): Promise<string[]>;
  /**
     * Reads a file from `/public` directory
     */
  read (rel: string): Promise<string>;
  /**
     * Writes a new file under `/public` directory
     */
  create (rel: string, data: string, meta?: IFilesystemReportMeta): Promise<void>;
  /**
     * Updates a file under `/public` directory
     */
  update (rel: string, data: string, meta?: IFilesystemReportMeta): Promise<void>;
  /**
     * Returns the file extension or checks if a file has a given extension
     */
  extension (file: string, checkExt?: string | string[]): string | boolean;
  /**
     * Converts a path relative to `/public` into an absolute one
     */
  getPublicPath (relative: string): string;
}
export default Filesystem
export type { IGlobOptions }
