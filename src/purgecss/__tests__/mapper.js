import { options } from '../../util'
import { mountModule, mountOptions } from '../../../test/utils'
import { AssetMapper } from '../mapper'

jest.mock('fs')
mountOptions()

describe('Mapper', () => {
  const _pub = options._public
  mountModule(`${_pub}/webpack.stats.json`, {
    assetsByChunkName: {
      app: ['foo.js'],
      polyfill: ['bar.js', '/lib.js']
    }
  })

  it('correctly loads default ignored files', () => {
    let mapper
    expect(() => { mapper = new AssetMapper() }).not.toThrow()
    expect(mapper.shouldIgnoreFile(`${_pub}/foo.js`)).toBe(true)
    expect(mapper.shouldIgnoreFile(`${_pub}/other/bar.js`)).toBe(false)
  })

  it('correctly loads custom ignored files as per options', () => {
    mountOptions({
      ignoreFiles: {
        webpack: ['polyfill'],
        pages: ['/about'],
        css: ['foo.css'],
        js: ['scripts/bar.js']
      }
    })
    let mapper
    expect(() => { mapper = new AssetMapper() }).not.toThrow()
    expect(mapper.shouldIgnoreFile(`${_pub}/foo.js`)).toBe(false)
    expect(mapper.shouldIgnoreFile(`${_pub}/lib.js`)).toBe(true)
    expect(mapper.shouldIgnoreFile(`${_pub}/about/index.html`)).toBe(true)
    expect(mapper.shouldIgnoreFile(`${_pub}/scripts/bar.js`)).toBe(true)
    expect(mapper.shouldIgnoreFile(`${_pub}/foo.png`)).toBe(false)
    expect(mapper.shouldIgnoreFile('foo.css')).toBe(false)
    expect(mapper.shouldIgnoreFile('foo')).toBe(false)
  })

  it('correctly links styles with file objects', () => {
    const files = [{ a: 1 }, { b: 2 }]
    let mapper
    expect(() => {
      mapper = new AssetMapper()
      mapper.linkStyleToFile('id', files[0])
      mapper.linkStyleToFile('id', files[1])
    }).not.toThrow()
    expect(mapper.getStyleLinks('id')).toMatchObject(files)
  })
})
