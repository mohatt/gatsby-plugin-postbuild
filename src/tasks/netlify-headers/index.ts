import Builder from './lib/builder'
import Link from './lib/link'
import type { ITaskApiEvents } from '~/tasks'
import type { IOptions } from './options'

let builder: Builder
// @ts-expect-error
export const events: ITaskApiEvents<IOptions> = {
  on: {
    postbuild: ({ options, filesystem }) => {
      builder = new Builder(options, filesystem)
    },
    shutdown: () => {
      return builder.build()
    }
  },
  html: {
    node: ({ node, file, options, gatsby }) => {
      if (node.nodeName === 'link') {
        const rel = node.attrs.find(a => a.name === 'rel' && Link.supports.rel.includes(a.value))
        if (!rel) return
        const href = node.attrs.find(a => a.name === 'href' && a.value)
        if (!href) return
        const link = Link.create(rel.value, href.value.replace(gatsby.pathPrefix, ''), node.attrs)
        builder.addPageLink(file.pagePath.replace(gatsby.pathPrefix, '') || '/', link)
        builder.addCachedAsset(link)
        if (options.removeLinkTags) {
          file.adaptor.detachNode(node)
        }
      }
    }
  }
}

export { options } from './options'
