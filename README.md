# Gatsby Postbuild

[![][npm-img]][npm-url] [![][ci-img]][ci-url] [![][codecov-img]][codecov-url] [![][gatsby-img]][gatsby-url] [![][license-img]][license-url]

Run structured post-processing on Gatsby's build output using simple, configurable postbuild tasks. Useful for keeping build-time tweaks out of the main source.

The plugin comes with these tasks out of the box:

- [HTTP Headers](https://github.com/mohatt/gatsby-plugin-postbuild/blob/master/src/tasks/http-headers)  
  Generate provider-specific header config files from Gatsby's build output and translate resource hints or meta tags into HTTP headers.
- [Minify](https://github.com/mohatt/gatsby-plugin-postbuild/blob/master/src/tasks/minify)  
  Optimise Gatsby's generated HTML by minifying inline assets using [terser](https://github.com/terser/terser) and [cssnano](https://github.com/cssnano/cssnano).

---

- [Installation](#installation)
- [Usage](#usage)
- [Options](#options)
  - [Define your own task](#define-your-own-task)
  - [Processing options](#processing-options)
  - [Ignoring files](#ignoring-files)
  - [Reporting](#reporting)
  - [Defaults](#defaults)
- [File transformers](#file-transformers)
- [Lifecycle events](#lifecycle-events)
- [License](#license)

## Installation

Install with your favorite package manager:

```sh
$ npm install gatsby-plugin-postbuild
```

## Usage

Enable the plugin in `gatsby-config.js` and opt in to the tasks you need.

```javascript
// in your `gatsby-config.js`
plugins: [
  {
    resolve: `gatsby-plugin-postbuild`,
    options: {
      'http-headers': {
        enabled: true,
      },
      minify: {
        enabled: true,
      },
    },
  },
]
```

Each task exposes its own options. See the task documentation under [`src/tasks`](https://github.com/mohatt/gatsby-plugin-postbuild/blob/master/src/tasks) for more details.

```javascript
plugins: [
  {
    resolve: `gatsby-plugin-postbuild`,
    options: {
      'http-headers': {
        enabled: true,
        provider: 'netlify',
        headers: {
          '[*]': {
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
          },
        },
      },
      minify: {
        enabled: true,
        ignore: ['resume/index.html'],
      },
    },
  },
]
```

## Options

### Define your own task

A Postbuild task is a group of functions that hook into events emitted by the available [file transformers](#file-transformers).

Define inline Postbuild tasks with the `events` option. Keys map to an extension (such as `html`) or a glob (`/icons/*.svg`). Provided functions receive a single argument describing the file, event, and helpers.

```javascript
options: {
  events: {
    svg: {
      contents: ({ raw, file }) => {
        // do something with the data
        return raw
      }
    }
  }
}
```

You can also use a `glob` pattern to match specific files:

```javascript
options: {
  events: {
    '/icons/*.svg': {
      contents: ({ raw, file }) => {
        // do something with the data
        return raw
      }
    }
  }
}
```

The `contents` event above is emitted by the [generic file transformer](#generic-file-transformer), which is used for unknown file types. Known file types expose more specific events so you can work with structured data.

```javascript
options: {
  events: {
    html: {
      node: ({ node, file }) => {
        if (node.nodeName === '#comment') {
          // strip comments from HTML files
          file.adaptor.detachNode(node)
        }
      }
    }
  }
}
```

Use the [File Transformers](#file-transformers) sections below to discover which events are available for each extension.

### Processing options

The plugin reads files, emits events, and writes results according to `processing` settings:

- `strategy`: set to `parallel` (default) for a single read/process/write pass (lower memory use) or `sequential` for a three-phase pipeline that lets tasks coordinate across all files (higher memory use, but allows operations that need data from every file).
- `concurrency`: number of files processed simultaneously.

Override behavior per extension with the `extensions` map:

```javascript
options: {
  processing: {
    strategy: 'parallel',
    concurrency: 20
  },
  extensions: {
    html: {
      strategy: 'sequential',
      concurrency: 5
    }
  }
}
```

### Ignoring files

Skip files globally with the top-level `ignore` option:

```javascript
options: {
  ignore: ['index.html', 'icons/logo.svg']
}
```

Each task also has its own `ignore` option, which only affects that task.

```javascript
options: {
  minify: {
    ignore: ['index.html', 'resume/index.html']
  }
}
```

### Reporting

Reporting is enabled by default and produces:

- `/public/postbuild.log.json` containing every change.
- A console summary during `gatsby build`.

Control reporting with either a boolean or an object:

```javascript
options: {
  reporting: {
    log: true,
    console: false
  }
}
// ...or disable everything
options: { reporting: false }
```

### Defaults

Defaults are defined in [`src/options.ts`](https://github.com/mohatt/gatsby-plugin-postbuild/blob/master/src/options.ts) and merged with your overrides:

```javascript
plugins: [
  {
    resolve: 'gatsby-plugin-postbuild',
    options: {
      enabled: true,
      reporting: true,
      ignore: [],
      events: {},
      processing: {
        strategy: 'parallel',
        concurrency: 10,
      },
      extensions: {},
    },
  },
]
```

## File Transformers

Transformers read a file, emit events, and hand control to tasks. Use them to tap into structured file data instead of string manipulation.

### Generic file transformer

Used for extensions without a custom transformer. Exposes a single event:

- `contents({ raw, options, file, event, filesystem, gatsby }) => string`
  - emitted just before writing a file. Return a string to replace the original contents.

### HTML file transformer

Backed by [Parse5](https://github.com/inikulin/parse5) to provide a DOM-like API:

- `parse({ html, options, file, event, filesystem, gatsby }) => string`
  - mutate the raw HTML before parsing.
- `tree({ options, file, event, filesystem, gatsby }) => void`
  - run once after the AST is created.
- `node({ node, options, file, event, filesystem, gatsby }) => void`
  - run for every AST node.
- `serialize({ options, file, event, filesystem, gatsby }) => void`
  - run before serialising the AST back to HTML.
- `write({ html, options, file, event, filesystem, gatsby }) => string`
  - override the final HTML right before it is written.

## Lifecycle Events

Lifecycle events run outside individual files and are available through the `on` namespace:

- `on.postbuild({ options, filesystem, gatsby, assets })`
  - fired before files are processed, ideal for initialisation.
- `on.shutdown({ options, filesystem, gatsby, assets })`
  - fired after processing completes for cleanup or final writes.
- `[extension].configure({ config, options, filesystem, gatsby })`
  - adjust processing configuration per extension before files are queued.

## License

[MIT][license-url]

[npm-url]: https://www.npmjs.com/package/gatsby-plugin-postbuild
[npm-img]: https://img.shields.io/npm/v/gatsby-plugin-postbuild.svg?logo=npm
[ci-url]: https://github.com/mohatt/gatsby-plugin-postbuild/actions/workflows/ci.yml
[ci-img]: https://img.shields.io/github/actions/workflow/status/mohatt/gatsby-plugin-postbuild/ci.yml?branch=master&logo=github
[codecov-url]: https://codecov.io/github/mohatt/gatsby-plugin-postbuild
[codecov-img]: https://img.shields.io/codecov/c/github/mohatt/gatsby-plugin-postbuild.svg?logo=codecov&logoColor=white
[gatsby-url]: https://www.gatsbyjs.org/packages/gatsby-plugin-postbuild
[gatsby-img]: https://img.shields.io/badge/gatsby->=5.10-blueviolet.svg?logo=gatsby
[license-url]: https://github.com/mohatt/gatsby-plugin-postbuild/blob/master/LICENSE
[license-img]: https://img.shields.io/github/license/mohatt/gatsby-plugin-postbuild.svg?logo=open%20source%20initiative&logoColor=white
