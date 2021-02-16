# Gatsby Postbuild
[![][npm-img]][npm-url] [![][ci-img]][ci-url] [![][codecov-img]][codecov-url] [![][gatsby-img]][gatsby-url] [![][license-img]][license-url]

Gatsby plugin for optimizing/minifying generated HTML/CSS files after build through removal of unused CSS rules.


> ##### Building a Gatsby site running TailwindCSS
<img width="832" src="https://raw.githubusercontent.com/mohatt/gatsby-plugin-postbuild/master/.github/console-screen.png" alt="Building a Gatsby site running TailwindCSS">

---
- [How it works](#how-it-works)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Options](#options)
- [License](#license)


## How it works
The plugin works diffrently than other plugins/techniques that utilize [PurgeCSS](https://purgecss.com/) in conjunction
with [PostCSS](https://postcss.org/) to acheive the same goal. The main diffrence is that the plugin only runs after
Gatsby builds the site, then optimizes the generated HTML/CSS files.

### Under the hood
The plugin uses [Parse5](https://github.com/inikulin/parse5) library to compile the generated html files into ASTs then:
- Removes all `<style>` nodes and their css from the tree
- Stores a temporary naked html without css
- Analyzes all html trees to create a map that links html files with common css/javascript assets
- Walks through the orginal tree and removes unused css rules by running PurgeCSS against the naked html files (+ any scripts included) according to the linked map created in the previous step, that includes:
  - Inline css rules defined under `<style>` tags
  - Local css files defines as `<link>` tags
- Serializes the tree back to HTML
- Writes optimized HTML/CSS files

## Installation
Install with [npm](https://www.npmjs.com/)
```sh
$ npm install --save gatsby-plugin-postbuild
```
or [yarn](https://yarnpkg.com/)
```sh
$ yarn add gatsby-plugin-postbuild
```


## Quick Start
Add the plugin to your `gatsby-config.js` and you're done, the plugin works well without any options

```javascript
plugins: [
  `gatsby-plugin-postbuild`,
]
```

### TailwindCSS
If you use [Tailwind](https://tailwindcss.com/)  in your site you need to set `purgecss.allowSymbols` to true like this:

```javascript
plugins: [
  {
    resolve: `gatsby-plugin-postbuild`,
    options: {
      purgecss: {
        allowSymbols: true
      }
    },
  }
]
```


## Options

### Defaults
These are the default plugin options defined in [`src/options.js`](src/options.js).

```javascript
plugins: [
  {
    resolve: 'gatsby-plugin-postbuild',
    options: {
      enabled: true,
      report: true,
      reportConsole: true,
      ignoreFiles: {
        webpack: ['app', 'polyfill'],
        pages: [],
        css: [],
        js: []
      },
      allowSymbols: false,
      purgecss: {
        rejected: true,
        fontFace: false,
        keyframes: false,
        variables: false
      }
    },
  }
]
```

#### enabled
> Type: `Boolean` Default: `true`

Whether to run postbuild or not.

#### report
> Type: `Boolean` Default: `true`

Write a `postbuild.log.json` file in `/public` directory with all the changes made.

#### reportConsole
> Type: `Boolean` Default: `true`

Print a summary report during build with all the changes made.

#### ignoreFiles.webpack
> Type: `Array` Default: `['app', 'polyfill']`

Webpack chunck names to ignore while purging CSS. You can find these at `/public/webpack.stats.json`.

*Note: This option will exclude all assetes under the given chunck names*

#### ignoreFiles.pages
> Type: `Array` Default: `[]`

Pages to exclude from optimiztion. This will also exclude all style assets defined in those page.

#### ignoreFiles.css
> Type: `Array` Default: `[]`

CSS files to exclude from optimiztion. *Paths should be relative to `/public` directory.*

#### ignoreFiles.js
> Type: `Array` Default: `[]`

Javascript files to ignore while purging CSS. *Paths should be relative to `/public` directory.*

#### allowSymbols
> Type: `Boolean` Default: `false`

Sets a custom PurgeCSS extractor that allows CSS selectors to contain symbols (e.g [TailwindCSS](https://tailwindcss.com/)).

### PurgeCSS options
The following options are passed to PurgeCSS while optimizing CSS. See [PurgeCSS Options][purgecss-config] for more info.

#### purgecss.rejected
> Type: `Boolean` Default: `true`

Write a `*.rejected.log` file in `/public` with the rejected selectors for every file.

#### purgecss.defaultExtractor
> Type: `Function` Default: [`PurgeCSS.defaultExtractor`][purgecss-config]

A custom PurgeCSS extractor to be used instead of the default one.

#### purgecss.safelist
> Type: `(Array|Object)` Default: `[]`

Selectors that are safe to leave in the final CSS.

#### purgecss.blocklist
> Type: `Array|Object` Default: `[]`

Selectors that are blocked from appearing in the final CSS.

#### purgecss.fontFace
> Type: `Boolean` Default: `false`

Remove any unused @font-face rules in your css.

#### purgecss.variables
> Type: `Boolean` Default: `false`

Remove any unused @keyframes rules in your css.

#### purgecss.keyframes
> Type: `Boolean` Default: `false`

Remove any unused variables in your css.


## License
[MIT][license-url]

[npm-url]: https://www.npmjs.com/package/gatsby-plugin-postbuild
[npm-img]: https://img.shields.io/npm/v/gatsby-plugin-postbuild.svg
[ci-url]: https://github.com/mohatt/gatsby-plugin-postbuild/actions
[ci-img]: https://img.shields.io/github/workflow/status/mohatt/gatsby-plugin-postbuild/CI/master
[codecov-url]: https://codecov.io/github/mohatt/gatsby-plugin-postbuild
[codecov-img]: https://img.shields.io/codecov/c/github/mohatt/gatsby-plugin-postbuild.svg
[gatsby-url]: https://www.gatsbyjs.org/packages/gatsby-plugin-postbuild
[gatsby-img]: https://img.shields.io/badge/gatsby-v2.25+-blueviolet.svg
[license-url]: https://github.com/mohatt/gatsby-plugin-postbuild/blob/master/LICENSE
[license-img]: https://img.shields.io/github/license/mohatt/gatsby-plugin-postbuild.svg
[purgecss-config]: https://purgecss.com/configuration.html
