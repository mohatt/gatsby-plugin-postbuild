import Provider from './base'
import { PathPlaceholder } from '../builder'
import type { IPathHeadersMap } from '../../options'

export default class VercelProvider extends Provider {
  filename = 'vercel.json'
  placeholders = {
    [PathPlaceholder.All]: '/(.*)',
    [PathPlaceholder.PageData]: '/page-data/(.*)',
    [PathPlaceholder.Static]: '/static/(.*)'
  }

  async build (headers: IPathHeadersMap): Promise<string> {
    let config: any = {}
    try {
      config = JSON.parse(await this.fs.read('../vercel.json'))
    } catch (e) {}

    config.headers = []
    for (const path in headers) {
      const pathHeaders = []
      for (const header in headers[path]) {
        const value = headers[path][header]
        pathHeaders.push({
          key: header,
          value: Array.isArray(value)
            ? value.join(', ')
            : value
        })
      }
      config.headers.push({
        source: path,
        headers: pathHeaders
      })
    }

    return JSON.stringify(config, null, 2)
  }
}
