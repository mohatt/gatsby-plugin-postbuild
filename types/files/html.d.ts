import * as parse5 from 'parse5'
import parse5Adaptor from 'parse5/lib/tree-adapters/default'
import File from './base'
import type { IExtensionOptions } from '../index'
export declare type IFileHtmlOptions = IExtensionOptions<{
  commons: {
    [type: string]: string[]
  }
}>
/**
 * A callback function to be run on tree nodes
 * @see FileHtml.walk
 */
export declare type IFileHtmlNodeWalker = (node: parse5.Node, prev?: parse5.Node, next?: parse5.Node) => Promise<void> | void
/**
 * Interface for html files
 */
export declare class FileHtml extends File {
  /**
     * Path to the html page
     */
  pagePath: string
  /**
     * Compiled ast tree
     */
  tree: parse5.Document
  /**
     * Parse5 tree adaptor
     */
  adaptor: typeof parse5Adaptor
  /**
     * Html extension options
     */
  options: IFileHtmlOptions
  /**
     * Recursively walks through a parse5 tree invoking a callback
     *  on every node on the tree.
     */
  walk (cb: IFileHtmlNodeWalker, root?: parse5.Node, processGatsbyNode?: boolean): Promise<void>;
  /**
     * Resolves a href attribute of a given node into local file path
     *
     * @todo test this method on win32 platform
     * @param node - Parse5 element node
     * @param attrib - Target attribute. Defaults to `href`
     * @param relative - Return path relative to `/public`. Defaults to `true`
     * @param strict - Return false if resolved path is outside `/public`. Defaults to `true`
     * @return Resolved file path or false on failure to meet conditions
     */
  resolveHref (node: parse5.Element, attrib?: string, relative?: boolean, strict?: boolean): string | boolean;
}
export default FileHtml
