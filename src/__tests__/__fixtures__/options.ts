import type { IUserOptions } from '@postbuild/interfaces'
import { DEFAULTS } from '@postbuild/options'

const options: Array<{ title: string; options: IUserOptions | object }> = [
  {
    title: 'should validate default options',
    options: DEFAULTS,
  },
  {
    title: 'should invalidate options with incorrect data types',
    options: {
      enabled: '',
      reporting: null,
      processing: {
        strategy: 5,
        concurrency: false,
      },
      ignore: {},
      events: {
        foo: 'invalid',
        on: { bootstrap: 'a' },
        html: { parse: 'a' },
        txt: { content: 'a' },
      },
      extensions: {
        foo: 'bar',
        txt: {
          strategy: [],
          concurrency: false,
        },
      },
    },
  },
  {
    title: 'should invalidate empty options',
    options: {
      processing: {
        strategy: '',
        concurrency: 0,
      },
      ignore: [''],
      extensions: {
        txt: {
          concurrency: 0,
          strategy: '',
        },
      },
    },
  },
  {
    title: 'should invalidate invalid options',
    options: {
      processing: {
        strategy: 'foo',
        concurrency: -1,
      },
      extensions: {
        txt: {
          concurrency: -1,
          strategy: 'bar',
        },
      },
      events: {
        on: { load: () => 0 },
        html: { content: () => 0, tree: () => 0 },
        '/*.txt': { content: () => 0 },
      },
    },
  },
  {
    title: 'should validate correct options',
    options: {
      enabled: true,
      reporting: {
        log: true,
        console: false,
      },
      ignore: ['a'],
      processing: {
        strategy: 'sequential',
        concurrency: 25,
      },
      extensions: {
        txt: {
          concurrency: 11,
          strategy: 'parallel',
        },
      },
      events: {
        on: { bootstrap: () => 0 },
        html: { node: () => 0 },
        txt: { content: () => 0 },
        '/*.+(html|txt)': { content: () => 0, node: () => 0 },
      },
    },
  },
  {
    title: 'should validate correct options (with alternatives)',
    options: {
      reporting: false,
    },
  },
  {
    title: 'should invalidate invalid tasks options',
    options: {
      minify: {
        enabled: 'invalid',
        ignore: 'invalid',
        style: 'invalid',
      },
      'http-headers': {
        headers: [],
        provider: 'invalid',
        caching: 'invalid',
      },
    },
  },
  {
    title: 'should validate correct tasks options',
    options: {
      minify: {
        enabled: true,
        ignore: ['a', 'b'],
      },
      'http-headers': {
        enabled: true,
        provider: 'firebase',
        headers: {
          '*': { 'X-Test-Header': 'test-value' },
          '[pages]': {
            link: ['<https://www.ab.com>; rel=preconnect'],
          },
        },
      },
    },
  },
]

export default options
