import Provider from './base'
import { PathPlaceholder } from '../builder'
import type { IPathHeadersMap } from '../../options'

export default class NetlifyProvider extends Provider {
  filename = '_headers'
  placeholders = {
    [PathPlaceholder.All]: '/*',
    [PathPlaceholder.PageData]: '/page-data/*',
    [PathPlaceholder.Static]: '/static/*',
  }

  async build(headers: IPathHeadersMap): Promise<string> {
    const lines = []
    for (const path in headers) {
      lines.push(path)
      for (const header in headers[path]) {
        const value = headers[path][header]
        if (Array.isArray(value)) {
          value.forEach((v) => lines.push(`  ${header}: ${v}`))
          continue
        }
        lines.push(`  ${header}: ${value}`)
      }
    }
    return lines.join('\n')
  }
}
