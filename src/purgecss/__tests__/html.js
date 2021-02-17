import { options } from '../../util'
import { mountFile, mountOptions } from '../../../test/utils'
import { HtmlFile } from '../html'

jest.mock('fs')
mountOptions()

describe('HtmlFile', () => {
  const { AssetMapper } = jest.createMockFromModule('../mapper')
  const { FileWriter } = jest.createMockFromModule('../writer')
  const { Purger } = jest.createMockFromModule('../purger')

  const mapper = new AssetMapper()
  const writer = new FileWriter()
  const purger = new Purger()

  it('correctly loads html file', async () => {
    let file
    const filename = '/path/to/file.html'
    const html = `
<html>
  <head>
    <style id="global" type="text/css">html{}</style>
    <style type="text/css">body{}</style>
    <link rel="stylesheet" href="styles/style.css" />
    <link rel="preload" href="scrips/foo.js" />
    <script src="scrips/bar.js"></script>
  </head>
  <body>
    <style type="text/css">div{}</style>
    <div>
      <style type="text/css">p{}</style>
      Hi
    </div>
    <script src="scrips/foo.js"></script>
  </body>
</html>`
    mountFile(filename, html)

    await expect(() => {
      file = new HtmlFile(filename, mapper, purger, writer)
      return file.load()
    }).not.toThrow()
    expect(file.nakedHtml).toMatchSnapshot()
    expect(() => { file.loadAssets() }).not.toThrow()
    expect(file.styles.length).toBe(5)
    expect(file.scripts.length).toBe(2)
    expect(mapper.linkStyleToFile.mock.calls.length).toBe(3)
    await expect(() => file.purgeStyles()).not.toThrow()
    expect(purger.purge.mock.calls.length).toBe(5)
    expect(writer.write.mock.calls.length).toBe(1)
  })

  it('correctly resolves asset hrefs', () => {
    let file
    const filename = `${options._public}/page/index.html`
    const hrefs = [
      'foo.js',
      './foo.js',
      '../foo.js',
      '/foo.js',
      '/dir/foo.js',
      '../dir/foo.js',
      '/dir/foo.js'
    ]
    const resolveHref = (href) => {
      return file.resolveHref({
        attribs: { href: href }
      })
    }

    expect(() => { file = new HtmlFile(filename) }).not.toThrow()
    expect(hrefs.map(h => resolveHref(h))).toMatchSnapshot()
    options._pathPrefix = '/path/prefix/'
    expect(hrefs.map(h => resolveHref(h))).toMatchSnapshot()
  })
})