import { SUPPORTS } from './index'
import type { PathPlaceholder } from '../builder'
import type { IPathHeadersMap, IHttpHeadersTaskOptions } from '../../options'
import { Filesystem } from '@postbuild/filesystem'

export type IPathPlaceholders = {
  [p in Exclude<PathPlaceholder, PathPlaceholder.Pages | PathPlaceholder.Assets>]: string
}

export interface IProviderArtifact {
  filename: string
  data: string
}

export abstract class Provider {
  protected abstract filename: string
  protected abstract placeholders: IPathPlaceholders
  protected readonly options: IHttpHeadersTaskOptions
  protected readonly fs: Filesystem
  constructor(options: IHttpHeadersTaskOptions, fs: Filesystem) {
    this.options = options
    this.fs = fs
  }

  static factory = (options: IHttpHeadersTaskOptions, fs: Filesystem): Provider => {
    if (!(options.provider in SUPPORTS)) {
      throw new TypeError(`Invalid headers file provider "${options.provider}"`)
    }

    // @ts-expect-error
    return new SUPPORTS[options.provider](options, fs)
  }

  public getFilename(): string {
    return this.filename
  }

  public processPath(path: string): string {
    return path in this.placeholders ? this.placeholders[path as keyof IPathPlaceholders] : path
  }

  public abstract build(headers: IPathHeadersMap): Promise<string>
}

export default Provider
