import { mountFile, mountOptions } from '../../../test/utils'
import { Purger } from '../purger'
import { StyleFile, StyleInline } from '../html'

jest.mock('fs')
mountOptions()

describe('Purger', () => {
  const writer = { write: jest.fn() }
  const mapper = {}

  it('correctly sets default purgecss extractor', () => {
    mountOptions({
      allowSymbols: true
    })
    let purger
    expect(() => { purger = new Purger(mapper) }).not.toThrow()
    expect(purger.purgeOptions.defaultExtractor('.sel:ec to/r')).toMatchObject(['sel:ec', 'to/r'])
  })

  it('correctly purges styles', async () => {
    mountFile('/foo/bar.css', '.foo{} .bar{width:auto}')
    const fixt = {
      style1: new StyleInline({ data: '.foo{} .bar{width:auto}' }),
      style2: new StyleFile(writer, '/foo/bar.css'),
      file: { nakedHtml: '<div class="bar"></div>', scripts: [] }
    }
    let purger
    expect(() => { purger = new Purger(mapper) }).not.toThrow()
    await expect(purger.purge(fixt.style1, fixt.file)).resolves.toMatchSnapshot()
    await expect(purger.purge(fixt.style2, fixt.file)).resolves.toMatchSnapshot()
    expect(fixt.style1.read()).toMatchSnapshot()
    expect(writer.write.mock.calls).toMatchSnapshot()
  })

  it('correctly purges styles against html with scripts', async () => {
    mountFile('/foo/bar.js', 'function func(){ var test="foo" }')
    const fixt = {
      style: new StyleInline({ data: '.foo{} .bar{width:auto} .lorem{}' }),
      file: { nakedHtml: '<div class="bar"></div>', scripts: ['/foo/bar.js'] }
    }
    let purger
    expect(() => { purger = new Purger(mapper) }).not.toThrow()
    await expect(purger.purge(fixt.style, fixt.file)).resolves.toMatchSnapshot()
    expect(fixt.style.read()).toMatchSnapshot()
  })

  it('correctly purges linked styles', async () => {
    const style = new StyleInline({ data: '.foo{} .bar{width:auto} .lorem{}' })
    style.setID('foo')
    const fixt = {
      style,
      file1: { nakedHtml: '<div class="foo"></div>', scripts: [] },
      file2: { nakedHtml: '<div class="bar"></div>', scripts: [] }
    }
    let purger
    mapper.getStyleLinks = () => [fixt.file1, fixt.file2]
    expect(() => { purger = new Purger(mapper) }).not.toThrow()
    await expect(purger.purge(fixt.style, fixt.file1)).resolves.toMatchSnapshot()
    await expect(purger.purge(fixt.style, fixt.file2)).resolves.toMatchSnapshot()
  })
})