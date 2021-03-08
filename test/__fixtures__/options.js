export default [
  {
    title: 'should invalidate unknown options',
    options: {
      unknown: 5,
      invalid: {
        bar: true
      }
    }
  },
  {
    title: 'should invalidate options with incorrect data types',
    options: {
      enabled: 5,
      report: '',
      processing: {
        strategy: 5,
        concurrency: false
      },
      ignore: {},
      events: {
        foo: 'invalid',
        on: { bootstrap: 'a' },
        html: { parse: 'a' },
        txt: { content: 'a' }
      },
      extensions: {
        foo: 'bar',
        txt: {
          strategy: [],
          concurrency: false
        }
      }
    }
  },
  {
    title: 'should invalidate empty options',
    options: {
      processing: {
        strategy: '',
        concurrency: 0
      },
      ignore: [''],
      extensions: {
        txt: {
          concurrency: 0,
          strategy: ''
        }
      }
    }
  },
  {
    title: 'should invalidate invalid options',
    options: {
      processing: {
        strategy: 'foo',
        concurrency: -1
      },
      extensions: {
        txt: {
          concurrency: -1,
          strategy: 'bar'
        }
      },
      events: {
        on: { load: () => 0 },
        html: { content: () => 0 },
        txt: { parse: () => 0 }
      }
    }
  },
  {
    title: 'should validate correct options',
    options: {
      enabled: true,
      report: false,
      consoleReport: false,
      ignore: ['a'],
      processing: {
        strategy: 'sequential',
        concurrency: 25
      },
      extensions: {
        txt: {
          concurrency: 11,
          strategy: 'parallel'
        }
      },
      events: {
        on: { bootstrap: () => 0 },
        html: { node: () => 0 },
        txt: { content: () => 0 }
      }
    }
  },
  {
    title: 'should invalidate invalid tasks options',
    options: {
      foo: {
        bar: true
      },
      lorem: 'invalid'
    }
  },
  {
    title: 'should validate correct tasks options',
    options: {
      foo: {
        bar: 'valid'
      },
      lorem: {
        ipsum: true
      }
    }
  }
]
