import type { Token } from 'parse5'

export default class Link {
  static supports: {
    [rel: string]: {
      attrs: string[]
      priority: number
    }
  } = {
    preconnect: {
      attrs: ['crossorigin'],
      priority: 0,
    },
    'dns-prefetch': {
      attrs: [],
      priority: 10,
    },
    preload: {
      attrs: ['as', 'type', 'media', 'crossorigin'],
      priority: 20,
    },
    prerender: {
      attrs: [],
      priority: 30,
    },
    prefetch: {
      attrs: ['as', 'crossorigin'],
      priority: 40,
    },
  }

  href: string
  type: string
  attrs: { [p: string]: string } = {}
  priority: number = 0

  constructor(href: string, type: string) {
    this.href = href
    this.type = type
  }

  toString(): string {
    return [`<${this.href}>`]
      .concat(`rel=${this.type}`)
      .concat(
        Object.keys(this.attrs).map((k) => {
          const v = this.attrs[k]
          return v ? `${k}=${/^\w+$/.test(v) ? v : `"${v}"`}` : k
        }),
      )
      .join('; ')
  }

  static create(type: string, href: string, attrs: Token.Attribute[]): Link {
    if (!(type in Link.supports)) {
      throw new TypeError(`Link type "${type}" is not supported`)
    }

    const link = new Link(href, type)
    const support = Link.supports[type]
    link.attrs = attrs.reduce((las, a) => {
      if (support.attrs.includes(a.name)) {
        las[a.name] = a.value
      }
      return las
    }, link.attrs)
    link.priority = support.priority
    return link
  }
}
