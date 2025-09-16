# Purgecss

A Postbuild task that optimizes generated HTML/CSS files by removing unused CSS selectors. The task uses [PurgeCSS library][purgecss] under the hood.

## Usage

Enable the task in your `gatsby-config.js`

```javascript
plugins: [
  {
    resolve: `gatsby-plugin-postbuild`,
    options: {
      purgecss: {
        enabled: true,
      },
    },
  },
]
```

## Options

#### allowSymbols

> Type: `Boolean` Default: `false`

Sets a custom PurgeCSS extractor that allows CSS selectors to contain symbols (e.g [TailwindCSS](https://tailwindcss.com/)).

#### ignoreAssets.css

> Type: `Array` Default: `[]`

CSS files to exclude from optimiztion.

#### ignoreAssets.js

> Type: `Array` Default: `[]`

JavaScript files to ignore while purging CSS.

#### ignoreAssets.webpack

> Type: `Array` Default: `['app', 'polyfill']`

Ignores all JavaScript files under the specified chunck names. You can find these at `/public/webpack.stats.json`.

#### writeRejected

> Type: `Boolean` Default: `true`

Write a text file under `/public` with a list of rejected selectors for every file (useful for debugging).

### PurgeCSS options

The following options are passed to PurgeCSS while optimizing CSS. See [PurgeCSS Options][purgecss-config] for more info.

#### defaultExtractor

> Type: `Function` Default: [`PurgeCSS.defaultExtractor`][purgecss-config]

A custom PurgeCSS extractor to be used instead of the default one.

#### safelist

> Type: `(Array|Object)` Default: `[]`

Selectors that are safe to leave in the final CSS.

#### blocklist

> Type: `Array|Object` Default: `[]`

Selectors that are blocked from appearing in the final CSS.

#### fontFace

> Type: `Boolean` Default: `false`

Remove any unused `@font-face` rules in your css.

#### variables

> Type: `Boolean` Default: `false`

Remove any unused `@keyframes` rules in your css.

#### keyframes

> Type: `Boolean` Default: `false`

Remove any unused variables in your css.

[purgecss]: https://purgecss.com/
[purgecss-config]: https://purgecss.com/configuration.html
