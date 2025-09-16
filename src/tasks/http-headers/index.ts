import type { DefaultTreeAdapterTypes as parse5 } from 'parse5'
import type { ITask, ITaskApiEvents } from '@postbuild'
import Builder from './lib/builder'
import Link from './lib/link'
import Meta from './lib/meta'
import { options, IOptions } from './options'

/**
 * Headers file builder
 */
let builder: Builder

function isInHead(node: parse5.ChildNode): boolean {
  let parent = node?.parentNode
  while (parent) {
    if (parent.nodeName === 'head') return true
    parent = (parent as any).parentNode
  }
  return false
}

export const events: ITaskApiEvents<IOptions> = {
  on: {
    postbuild: ({ options, filesystem, gatsby, assets }) => {
      builder = new Builder(options, assets, filesystem, gatsby.pathPrefix)
    },
    shutdown: () => {
      return builder.build()
    },
  },
  html: {
    node: ({ node, file, options }) => {
      if (node.nodeName === 'link' && isInHead(node)) {
        const rels = node.attrs
          .find((a) => a.name === 'rel')
          ?.value.trim()
          .toLowerCase()
          .split(' ')
        if (rels === undefined || rels.length === 0) return
        let href = node.attrs.find((a) => a.name === 'href')?.value.trim()
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

      if (node.nodeName === 'meta' && isInHead(node)) {
        const meta = Meta.create(node.attrs)
        if (meta) {
          builder.addPageMeta(builder.normalizeHref(file.pagePath), meta)

          if (options.removeMetaTags) {
            file.adaptor.detachNode(node)
          }
        }
      }
    },
  },
}

const task: ITask<IOptions> = {
  id: 'http-headers',
  events,
  options,
}

export default task
