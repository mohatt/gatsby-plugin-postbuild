import File from './base'
import FileGeneric from './generic'
import FileHtml from './html'

/**
 * @internal
 */
export const SUPPORTS: { [ext: string]: typeof File } = {
  '*': FileGeneric,
  html: FileHtml
}

export { File, FileGeneric, FileHtml }
