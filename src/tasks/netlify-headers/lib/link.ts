import type * as parse5 from 'parse5'

export default class Link {
  static supports: {
    rel: string[]
    relMeta: { [p: string]: string[] }
    relPriority: { [p: string]: number }
  } = {
    rel: ['preload', 'prefetch', 'preconnect', 'dns-prefetch'],
    relMeta: {
      preload: ['as', 'type', 'media', 'crossorigin'],
      prefetch: ['as', 'crossorigin'],
      preconnect: ['crossorigin'],
      'dns-prefetch': []
    },
    relPriority: {
      'dns-prefetch': 0,
      preconnect: 10,
      preload: 20,
      prefetch: 30
    }
  }

  href: string
  type: string
  meta: { [p: string]: string } = {}
  priority: number = 0

  constructor (href: string, type: string) {
    this.href = href
    this.type = type
  }

  toString (): string {
    return [`<${this.href}>`]
      .concat(`rel=${this.type}`)
      .concat(Object.keys(this.meta).map(k => {
        const v = this.meta[k]
        return v ? `${k}=${/^\w+$/.test(v) ? v : `"${v}"`}` : k
      }))
      .join('; ')
  }

  static create (type: string, href: string, attrs: parse5.Attribute[]): Link {
    if (!Link.supports.rel.includes(type)) {
      throw new TypeError(`Link type "${type}" is not supported`)
    }

    const link = new Link(href, type)
    const supportedMeta = Link.supports.relMeta[type]
    link.meta = attrs.reduce((m, a) => {
      if (supportedMeta.includes(a.name)) {
        m[a.name] = a.value
      }
      return m
    }, link.meta)
    link.priority = Link.supports.relPriority[type]
    return link
  }
}
