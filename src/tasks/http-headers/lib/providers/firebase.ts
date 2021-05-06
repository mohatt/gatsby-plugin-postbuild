import Provider from './base'
import { PathPlaceholder } from '../builder'
import type { IPathHeadersMap } from '../../options'

export default class FirebaseProvider extends Provider {
  filename = 'firebase.json'
  placeholders = {
    [PathPlaceholder.All]: '**/*',
    [PathPlaceholder.PageData]: 'page-data/**',
    [PathPlaceholder.Static]: 'static/**'
  }

  processPath (path: string): string {
    path = super.processPath(path)
    if (path.startsWith('/') && path !== '/') {
      path = path.replace('/', '')
    }
    return path
  }

  async build (headers: IPathHeadersMap): Promise<string> {
    let config: any = {
      hosting: {
        public: 'public',
        ignore: [
          'firebase.json',
          '**/.*',
          '**/node_modules/**'
        ]
      }
    }
    try {
      config = JSON.parse(await this.fs.read('../firebase.json'))
    } catch (e) {}

    config.hosting.headers = []
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
      config.hosting.headers.push({
        source: path,
        headers: pathHeaders
      })
    }

    return JSON.stringify(config, null, 2)
  }
}
