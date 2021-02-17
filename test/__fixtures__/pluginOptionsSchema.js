export default [
  {
    title: 'should invalidate unknown options',
    options: {
      unknown: 5,
      foo: {
        bar: true
      }
    }
  },
  {
    title: 'should invalidate options with incorrect data types',
    options: {
      enabled: 5,
      report: [],
      ignoreFiles: [],
      purgecss: {
        defaultExtractor: '',
        safelist: true,
        blocklist: [{}]
      }
    }
  },
  {
    title: 'should invalidate empty options',
    options: {
      ignoreFiles: {
        webpack: [''],
        pages: [''],
        css: [''],
        js: ['']
      }
    }
  },
  {
    title: 'should validate correct options',
    options: {
      enabled: true,
      report: false,
      reportConsole: true,
      allowSymbols: false,
      ignoreFiles: {
        webpack: ['a'],
        pages: ['b'],
        css: [],
        js: []
      },
      purgecss: {
        rejected: false,
        defaultExtractor: s => s,
        fontFace: false,
        keyframes: true,
        variables: true
      }
    }
  }
]
