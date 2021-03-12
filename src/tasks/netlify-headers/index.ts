import Builder from './lib/builder'
import Link from './lib/link'
import type { ITaskApiEvents } from '~/tasks'
import type { IOptions } from './options'

/**
 * Headers file builder
 */
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
        const rel = node.attrs.find(a => a.name === 'rel' && a.value in Link.supports)
        if (!rel) return
        const href = node.attrs.find(a => a.name === 'href' && a.value)
        if (!href) return

        // Create a new Link object
        // We are removing path prefixes since its irrelevant when deploying to Netlify
        const link = Link.create(rel.value, href.value.replace(gatsby.pathPrefix, ''), node.attrs)

        // Add the created link to the current page path
        builder.addPageLink(file.pagePath.replace(gatsby.pathPrefix, '') || '/', link)

        // If the link's href refers to a local path send it to the builder
        // to decide whether it should be listed as an immutable cached asset
        if (!/^\w+:\/\//.test(link.href)) {
          builder.addCachedAsset(link)
        }

        // Remove the link node if specified in task options
        if (options.removeLinkTags) {
          file.adaptor.detachNode(node)
        }
      }
    }
  }
}

export { options } from './options'
