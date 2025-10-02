# Minify

Optimise Gatsby's generated HTML by minifying inline assets using [terser][terser] and [cssnano][cssnano].

## Highlights

- Minifies inline `<script>` tags with [terser][terser].
- Minifies inline `<style>` tags with [cssnano][cssnano].
- Removes HTML comments and `<meta name="generator">` tags.

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

Use the `script` option to customize [terser][terser] options or `false` to disable minifying inline scripts:

```javascript
options: {
  minify: {
    script: {
      toplevel: true
    }
  }
}
```

Use the `style` option to customize the [cssnano][cssnano] preset or `false` to disable minifying inline styles:

```javascript
options: {
  minify: {
    style: [
      'default',
      {
        discardComments: {
          removeAllButFirst: true,
        },
      },
    ]
  }
}
```

[terser]: https://github.com/terser/terser
[cssnano]: https://github.com/cssnano/cssnano
