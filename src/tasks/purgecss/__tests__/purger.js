import { options } from '../../../util'
import { mountFile, mountModule, mountOptions } from '../../../../test/utils'
import { Purger } from '../purger'

jest.mock('fs')
mountOptions()

describe('Purger', () => {
  const _public = options._public
  const writer = { write: jest.fn() }
  mountModule(`${_public}/webpack.stats.json`, {
    assetsByChunkName: {
      app: ['foo.js'],
      polyfill: ['bar.js', '/lib.js']
    }
  })

  it('correctly sets default ignored scripts', () => {
    let purger
    expect(() => { purger = new Purger(writer) }).not.toThrow()
    expect(purger.ignoredScripts).toMatchSnapshot()
    expect(purger.shouldIgnoreScript(`${_public}/bar.js`)).toBe(true)
    expect(purger.shouldIgnoreScript(`${_public}/other/bar.js`)).toBe(false)
  })

  it('correctly sets default purgecss extractor', () => {
    mountOptions({
      purgecss: {
        allowSymbols: true
      }
    })
    let purger
    expect(() => { purger = new Purger(writer) }).not.toThrow()
    expect(purger.purgeOptions.defaultExtractor('.sel:ec to/r')).toMatchObject(['sel:ec', 'to/r'])
  })

  it('correctly purges styles', async () => {
    mountFile('/foo/bar.css', '.foo{} .bar{width:auto}')
    const fixt = {
      style1: { type: 'style', text: { data: '.foo{} .bar{width:auto}' } },
      style2: { type: 'link', file: '/foo/bar.css' },
      file: { nakedHtml: '<div class="bar"></div>', scripts: [] }
    }
    let purger
    expect(() => { purger = new Purger(writer) }).not.toThrow()
    await expect(purger.purge(fixt.style1, fixt.file)).resolves.toMatchSnapshot()
    await expect(purger.purge(fixt.style2, fixt.file)).resolves.toMatchSnapshot()
    expect(fixt.style1.text.data).toMatchSnapshot()
    expect(writer.write.mock.calls).toMatchSnapshot()
  })

  it('correctly purges linked styles', async () => {
    const fixt = {
      style: { id: 'foo', type: 'style', text: { data: '.foo{} .bar{width:auto} .lorem{}' } },
      file1: { nakedHtml: '<div class="foo"></div>', scripts: [] },
      file2: { nakedHtml: '<div class="bar"></div>', scripts: [] }
    }
    let purger
    expect(() => {
      purger = new Purger(writer)
      purger.linkStyle(fixt.style, fixt.file1)
      purger.linkStyle(fixt.style, fixt.file2)
    }).not.toThrow()
    await expect(purger.purge(fixt.style, fixt.file1)).resolves.toMatchSnapshot()
    await expect(purger.purge(fixt.style, fixt.file2)).resolves.toMatchSnapshot()
  })
})
