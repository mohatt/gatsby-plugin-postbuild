# Minify

A Postbuild task that minifies HTML inline scripts and styles using [terser][terser] and [cssnano][cssnano].

## Usage

Enable the task in your `gatsby-config.js`

```javascript
plugins: [
  {
    resolve: `gatsby-plugin-postbuild`,
    options: {
      minify: {
        enabled: true,
      },
    },
  },
]
```

## Options

### Custom minification options

Use `script` option to customize [terser][terser] options or `false` to disable minifying inline scripts

```javascript
options: {
  'minify': {
    script: {
      toplevel: true
    }
  }
}
```

Use `style` option to customize [cssnano][cssnano] preset or `false` to disable minifying inline styles

```javascript
options: {
  'minify': {
    style: ['default', {
      discardComments: {
        removeAllButFirst: true
      }
    }]
  }
}
```

[terser]: https://github.com/terser/terser
[cssnano]: https://github.com/cssnano/cssnano
