## [1.1.3](https://github.com/mohatt/gatsby-plugin-postbuild/compare/v1.1.2...v1.1.3) (2021-02-15)


### Bug Fixes

* **plugin:** fix a TypeError when an ignored webpack chunkName doesn't exist ([6014f80](https://github.com/mohatt/gatsby-plugin-postbuild/commit/6014f80d018ddbf55239f603fa13fdc26188b777))
* **plugin:** fixed reading external css files ([8373021](https://github.com/mohatt/gatsby-plugin-postbuild/commit/83730211606a9dd1db289d29eeaef291fef5e128))
* **plugin:** omit `extractors` option since its something we should handle it internally ([f846684](https://github.com/mohatt/gatsby-plugin-postbuild/commit/f8466844f03cd445140d33d2c1f66a0b689bb341))

## [1.1.2](https://github.com/mohatt/gatsby-plugin-postbuild/compare/v1.1.1...v1.1.2) (2021-02-14)


### Performance Improvements

* **plugin:** implemented reporter.activityTimer for better console output ([490c0e0](https://github.com/mohatt/gatsby-plugin-postbuild/commit/490c0e00a2dbfbf9193a3465808bba2e1b1af7fe))
* **plugin:** improved error reporting ([8fa4052](https://github.com/mohatt/gatsby-plugin-postbuild/commit/8fa4052c05cfdc4e7b673c732dd3fccfb5de1365))

## [1.1.1](https://github.com/mohatt/gatsby-plugin-postbuild/compare/v1.1.0...v1.1.1) (2021-02-14)


### Performance Improvements

* **plugin:** add debug messages for most tasks ([86db102](https://github.com/mohatt/gatsby-plugin-postbuild/commit/86db102537de3d7b81905d6c7dbc9853a522e837))
* **plugin:** add total saving to final report ([fa9eca1](https://github.com/mohatt/gatsby-plugin-postbuild/commit/fa9eca1fb9f10ef9d334a7058b1f01999b701bbd))
* **plugin:** no need for glob anymore ([72a7f72](https://github.com/mohatt/gatsby-plugin-postbuild/commit/72a7f723e0205463ece65f870d647f005784af10))

# [1.1.0](https://github.com/mohatt/gatsby-plugin-postbuild/compare/v1.0.3...v1.1.0) (2021-02-13)


### Bug Fixes

* **plugin:** lazy-load tasks module to allow utils to load first ([5edeb2d](https://github.com/mohatt/gatsby-plugin-postbuild/commit/5edeb2d20d3009e796bb9f8fdd467cf277e2c1c4))


### Features

* **plugin:** add support for local `link` and `script` files ([da21e3e](https://github.com/mohatt/gatsby-plugin-postbuild/commit/da21e3e84c4baf7a00c51e0f7ddd925d1df2a0dc))


### Performance Improvements

* **plugin:** split purgecss task into several submodules for better readability and testing ([fccf86a](https://github.com/mohatt/gatsby-plugin-postbuild/commit/fccf86aaac461ade15d032ad5f11571ad7f2e1b2))

## [1.0.3](https://github.com/mohatt/gatsby-plugin-postbuild/compare/v1.0.2...v1.0.3) (2021-02-11)


### Performance Improvements

* **plugin:** change tailwind option to allowSymbols ([4ec8913](https://github.com/mohatt/gatsby-plugin-postbuild/commit/4ec891349c89db16413ab287fc087fee865ce49d))
* **plugin:** improved some helper functions ([313ce5e](https://github.com/mohatt/gatsby-plugin-postbuild/commit/313ce5e054ec8ba7497a3ea333ebe9b9c529aa40))
* **plugin:** remove tasks API as its not needed ([07ec32a](https://github.com/mohatt/gatsby-plugin-postbuild/commit/07ec32ae3380fa319f8803bef8e96beda4658e30))

## [1.0.2](https://github.com/mohatt/gatsby-plugin-postbuild/compare/v1.0.1...v1.0.2) (2021-02-10)


### Bug Fixes

* **plugin:** uncomment this line NOW ([1977dc1](https://github.com/mohatt/gatsby-plugin-postbuild/commit/1977dc1eb052d24b64ba08cd9db09a48282ec262))

## [1.0.1](https://github.com/mohatt/gatsby-plugin-postbuild/compare/v1.0.0...v1.0.1) (2021-02-10)


### Bug Fixes

* **plugin:** trigger semantic-release to fix v1.0.0 ([cc7c113](https://github.com/mohatt/gatsby-plugin-postbuild/commit/cc7c11319a20b3831e4e3a2af19bd729ecdb56b8))

# 1.0.0 (2021-02-10)


### Features

* **plugin:** initial commit ([7af7d2d](https://github.com/mohatt/gatsby-plugin-postbuild/commit/7af7d2d043dd8e8395b096b34ea1acc5c46e5788))
