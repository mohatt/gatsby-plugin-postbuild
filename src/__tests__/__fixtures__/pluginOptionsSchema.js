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
      purgecss: {
        defaultExtractor: '',
        safelist: true,
        blocklist: [{}]
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
