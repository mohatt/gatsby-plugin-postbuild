# Gatsby Postbuild
[![][npm-img]][npm-url] [![][ci-img]][ci-url] [![][gatsby-img]][gatsby-url] [![][license-img]][license-url]

Gatsby plugin for optimizing/minifying generated HTML/CSS files after build through removing unused CSS rules.

<img width="380" src=".github/console-screen.png" alt="Console Screen">

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

The plugin uses [Parse5](https://github.com/inikulin/parse5) library to compile the generated HTML files into ASTs then:
- [x] Removes all `<style>` nodes and their CSS from the tree
- [x] Store a temporary naked HTML without CSS
- [x] Walks through the orginal tree and removes unused CSS rules by running PurgeCSS against the naked HTML files (only the ones that included those styles), that includes:
    - [x] Inline CSS rules defined under `<style>` tags
    - [ ] External CSS files defines as `<link>` tags
- [x] Serializes tree back to HTML
- [x] Writes optimized HTML/CSS files

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


## Options
Here is the list of options with their defaults.

### General options

#### enabled
> Type: `Boolean` Default: `true`

Whether to run postbuild or not.

#### report
> Type: `Boolean` Default: `true`

Write a `postbuild.log.json` file in `/public` directory with all the changes made.

#### reportConsole
> Type: `Boolean` Default: `true`

Print a summary report during build with all the changes made.

### PurgeCSS options
The following options are passed to PurgeCSS while optimizing CSS. See [PurgeCSS Config][purgecss-config] for more info.

#### purgecss.allowSymbols
> Type: `Boolean` Default: `false`

Allow CSS selectors to contain symbols (e.g [TailwindCSS](https://tailwindcss.com/)).

#### purgecss.rejected
> Type: `Boolean` Default: `true`

Write a `*.rejected.log` file in `/public` with the rejected selectors for every file.

#### purgecss.defaultExtractor
> Type: `Function` Default: [`PurgeCSS.defaultExtractor`][purgecss-config]

A custom PurgeCSS extractor to be used instead of the default one.

#### purgecss.extractors
> Type: `Array` Default: [`PurgeCSS.extractors`][purgecss-config]

A list of custom PurgeCSS extractors to be used for certain file types. 

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
[gatsby-url]: https://www.gatsbyjs.org/packages/gatsby-plugin-postbuild
[gatsby-img]: https://img.shields.io/badge/gatsby-v2.25+-blueviolet.svg
[license-url]: https://github.com/mohatt/gatsby-plugin-postbuild/blob/master/LICENSE
[license-img]: https://img.shields.io/github/license/mohatt/gatsby-plugin-postbuild.svg
[purgecss-config]: https://purgecss.com/configuration.html
