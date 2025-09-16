import type { Token } from 'parse5'

export default class Meta {
  static supports: {
    [metaName: string]: {
      header: string
      attr: string
      priority: number
    }
  } = {
    // Security
    'content-security-policy': {
      header: 'Content-Security-Policy',
      attr: 'content',
      priority: 0,
    },

    // Misc
    refresh: {
      header: 'Refresh',
      attr: 'content',
      priority: 30,
    },
    'set-cookie': {
      header: 'Set-Cookie',
      attr: 'content',
      priority: 40,
    },

    // Robots
    robots: {
      header: 'X-Robots-Tag',
      attr: 'content',
      priority: 50,
    },
    googlebot: {
      header: 'X-Robots-Tag',
      attr: 'content',
      priority: 51,
    },
    bingbot: {
      header: 'X-Robots-Tag',
      attr: 'content',
      priority: 52,
    },
  }

  static MULTI_VALUE_META_HEADERS = ['content-security-policy', 'x-robots-tag', 'set-cookie']

  name: string
  value: string
  header: string
  priority: number

  constructor(name: string, value: string, header: string, priority: number) {
    this.name = name
    this.value = value
    this.header = header
    this.priority = priority
  }

  static create(attrs: Token.Attribute[]): Meta | null {
    const nameAttr = attrs.find((a) => a.name === 'http-equiv' || a.name === 'name')
    if (!nameAttr) return null

    const name = nameAttr.value.toLowerCase()
    const support = Meta.supports[name]
    if (!support) return null

    const contentAttr = attrs.find((a) => a.name === support.attr)
    if (!contentAttr) return null

    const value = contentAttr.value.trim()
    if (!value) return null // skip empty or whitespace-only

    return new Meta(name, value, support.header, support.priority)
  }
}
