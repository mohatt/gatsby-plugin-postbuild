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
    postbuild: ({ options, filesystem, gatsby }) => {
      builder = new Builder(options, filesystem, gatsby.pathPrefix)
    },
    shutdown: () => {
      return builder.build()
    }
  },
  html: {
    node: ({ node, file, options }) => {
      if (node.nodeName === 'link') {
        const rels = node.attrs.find(a => a.name === 'rel')?.value.trim().toLowerCase().split(' ')
        if (rels === undefined || rels.length === 0) return
        let href = node.attrs.find(a => a.name === 'href')?.value.trim()
        if (href === undefined || href === '') return

        // Strip path prefixes from paths since its irrelevant when deploying to Netlify
        href = builder.normalizeHref(href)
        const path = builder.normalizeHref(file.pagePath)

        // Create a separate link for each rel
        for (const rel of rels) {
          // Check if rel is supported
          if (!(rel in Link.supports)) continue

          // Create a new Link object
          const link = Link.create(rel, href, node.attrs)

          // Add the created link to the current page path
          builder.addPageLink(path, link)

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
}

export { options } from './options'
