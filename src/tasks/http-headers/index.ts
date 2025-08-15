import Builder from './lib/builder'
import Link from './lib/link'
import { options, IOptions } from './options'
import type { ITask, ITaskApiEvents } from '@postbuild'

/**
 * Headers file builder
 */
let builder: Builder
export const events: ITaskApiEvents<IOptions> = {
  on: {
    postbuild: ({ options, filesystem, gatsby, assets }) => {
      builder = new Builder(options, assets, filesystem, gatsby.pathPrefix)
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

        // Strip out pathPrefix from paths since its irrelevant when deploying to Netlify
        href = builder.normalizeHref(href)
        const path = builder.normalizeHref(file.pagePath)

        // Whether the node is eligible for removal
        let removable = true
        // Create a separate link for each rel type
        for (const rel of rels) {
          // Check if rel type is supported
          if (!(rel in Link.supports)) {
            removable = false
            continue
          }

          // Create a new Link object
          const link = Link.create(rel, href, node.attrs)

          // Add the created link to the current page path
          builder.addPageLink(path, link)
        }

        // Remove the link node if specified in task options
        if (removable && options.removeLinkTags) {
          file.adaptor.detachNode(node)
        }
      }
    }
  }
}

const task: ITask<IOptions> = {
  id: 'http-headers',
  events,
  options,
}

export default task
