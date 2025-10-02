const testAssets = [
  ['test-asset--01.js', 'test-asset--01-xxx.js'],
  ['test-asset--01.js.map', 'test-asset--01-xxx.js.map'],
  ['test-asset--02.css', 'test-asset--02-xxx.css'],
  ['test-asset--02.css.map', 'test-asset--02-xxx.css.map'],
  ['test-asset--03.txt', 'test-asset--03-xxx.txt'],
  ['static/test-asset--04.jpg', 'static/test-asset--04-xxx.jpg'],
  ['styles.css', 'styles-xxx.css'],
  ['styles.css.map', 'styles-xxx.css.map'],
]

export class WebpackAssetsManifest {
  constructor({ assets, customize }) {
    for (const [key, value] of testAssets) {
      const entry = customize(
        { key, value },
        { key, value },
        { utils: { isKeyValuePair: () => true } },
      )
      if (entry) assets[entry.key] = entry.value
    }
  }
}
