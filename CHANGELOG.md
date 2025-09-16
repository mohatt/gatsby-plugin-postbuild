# [4.0.0](https://github.com/mohatt/gatsby-plugin-postbuild/compare/v3.0.2...v4.0.0) (2025-09-16)


### Bug Fixes

* **plugin:** skip incremental build runs ([cefc1ed](https://github.com/mohatt/gatsby-plugin-postbuild/commit/cefc1edecea83ce6423d23df1012d65a0931ece3))


### chore

* **deps:** update deps ([6e110f3](https://github.com/mohatt/gatsby-plugin-postbuild/commit/6e110f301865732ecb1b18e4d630dcf176ed4083))


### fear

* **plugin:** migrate to Gatsby v5 ([7333212](https://github.com/mohatt/gatsby-plugin-postbuild/commit/733321252bac65af1903275dcc09417e27952b11))


### Features

* **plugin:** migrate the plugin to native ES modules, add CJS & ESM builds ([09ac8b8](https://github.com/mohatt/gatsby-plugin-postbuild/commit/09ac8b847f14357bf2be480699c582ef44b93d39))
* **plugin:** support meta tags in `http-headers` task ([2646385](https://github.com/mohatt/gatsby-plugin-postbuild/commit/26463851ceff0d383d5dbbad15e802e9c480747c))


### BREAKING CHANGES

* **plugin:** The plugin now requires at least Gatsby v5.10.

Signed-off-by: Mohamed Elkholy <mkh117@gmail.com>
* **deps:** Drop support for node < 18.

Signed-off-by: Mohamed Elkholy <mkh117@gmail.com>
* **plugin:** The plugin is now built with native ES module syntax.

Signed-off-by: Mohamed Elkholy <mkh117@gmail.com>

# [4.0.0-beta.2](https://github.com/mohatt/gatsby-plugin-postbuild/compare/v4.0.0-beta.1...v4.0.0-beta.2) (2025-09-16)


### Bug Fixes

* **plugin:** skip incremental build runs ([cefc1ed](https://github.com/mohatt/gatsby-plugin-postbuild/commit/cefc1edecea83ce6423d23df1012d65a0931ece3))


### Features

* **plugin:** support meta tags in `http-headers` task ([2646385](https://github.com/mohatt/gatsby-plugin-postbuild/commit/26463851ceff0d383d5dbbad15e802e9c480747c))

# [4.0.0-beta.1](https://github.com/mohatt/gatsby-plugin-postbuild/compare/v3.0.2...v4.0.0-beta.1) (2025-08-15)


### chore

* **deps:** update deps ([6e110f3](https://github.com/mohatt/gatsby-plugin-postbuild/commit/6e110f301865732ecb1b18e4d630dcf176ed4083))


### fear

* **plugin:** migrate to Gatsby v5 ([7333212](https://github.com/mohatt/gatsby-plugin-postbuild/commit/733321252bac65af1903275dcc09417e27952b11))


### Features

* **plugin:** migrate the plugin to native ES modules, add CJS & ESM builds ([09ac8b8](https://github.com/mohatt/gatsby-plugin-postbuild/commit/09ac8b847f14357bf2be480699c582ef44b93d39))


### BREAKING CHANGES

* **plugin:** The plugin now requires at least Gatsby v5.10.

Signed-off-by: Mohamed Elkholy <mkh117@gmail.com>
* **deps:** Drop support for node < 18.

Signed-off-by: Mohamed Elkholy <mkh117@gmail.com>
* **plugin:** The plugin is now built with native ES module syntax.

Signed-off-by: Mohamed Elkholy <mkh117@gmail.com>

## [3.0.2](https://github.com/mohatt/gatsby-plugin-postbuild/compare/v3.0.1...v3.0.2) (2021-07-29)


### Bug Fixes

* **plugin:** fix license ([aec6be9](https://github.com/mohatt/gatsby-plugin-postbuild/commit/aec6be933a760e33ee9eec8aa0607c1f22547bf7))
* **task:purgecss:** ignore `id` attribute on inline styles ([332f797](https://github.com/mohatt/gatsby-plugin-postbuild/commit/332f797f7e023cc9b44409957e54fd56a6956d79))

## [3.0.1](https://github.com/mohatt/gatsby-plugin-postbuild/compare/v3.0.0...v3.0.1) (2021-05-09)


### Bug Fixes

* **task:http-headers:** fix paths with no headers ([8db02b3](https://github.com/mohatt/gatsby-plugin-postbuild/commit/8db02b3fe6e45b513a80530aa7d21158453d7b85))

# [3.0.0](https://github.com/mohatt/gatsby-plugin-postbuild/compare/v2.3.1...v3.0.0) (2021-05-09)


### Bug Fixes

* **task:http-headers:** add support for `asset` paths ([98d42cb](https://github.com/mohatt/gatsby-plugin-postbuild/commit/98d42cb4efd0b1551be2beb38702639c6897dc18))


### Documentation

* **plugin:** bump minimum gatsby version to 3.0 ([98aa63e](https://github.com/mohatt/gatsby-plugin-postbuild/commit/98aa63efbcdf08d4426c66d6441e202d8f3b628e))


### Features

* **plugin:** add `assets` api to allow fetching assets by their original filename ([9d64f79](https://github.com/mohatt/gatsby-plugin-postbuild/commit/9d64f79a480d2a791e493253279333fb8f60cce5))


### BREAKING CHANGES

* **plugin:** The plugin now requires at least Gatsby v3.0.4

## [2.3.1](https://github.com/mohatt/gatsby-plugin-postbuild/compare/v2.3.0...v2.3.1) (2021-05-06)


### Bug Fixes

* **task:http-headers:** fix `/` page path ([9a2db7c](https://github.com/mohatt/gatsby-plugin-postbuild/commit/9a2db7cf4b6e6788bbd85ef8b2560cff415ccb26))

# [2.3.0](https://github.com/mohatt/gatsby-plugin-postbuild/compare/v2.2.2...v2.3.0) (2021-05-06)


### Features

* **task:http-headers:** add support for other providers (Vercel, Firebase) ([6289f61](https://github.com/mohatt/gatsby-plugin-postbuild/commit/6289f6158b00110d8f4af62906c15f68b73d4f21))
* **task:http-headers:** change task name to `http-headers` ([9e35fb7](https://github.com/mohatt/gatsby-plugin-postbuild/commit/9e35fb795b975732809321d5c79f338d2f7d1679))


### Performance Improvements

* **task:purgecss:** code refactorings, no api changes ([ccf5f9d](https://github.com/mohatt/gatsby-plugin-postbuild/commit/ccf5f9dbc6b41adf76540401b081d7140aecfc99))

## [2.2.2](https://github.com/mohatt/gatsby-plugin-postbuild/compare/v2.2.1...v2.2.2) (2021-04-12)


### Performance Improvements

* **plugin:** update cssnano to v5 ([9f880c4](https://github.com/mohatt/gatsby-plugin-postbuild/commit/9f880c44d85912532ffa483f89eb3cf5c2a99d2d))

## [2.2.1](https://github.com/mohatt/gatsby-plugin-postbuild/compare/v2.2.0...v2.2.1) (2021-04-09)


### Bug Fixes

* **task:purgecss:** shallow clone purgecss options before purging ([8f6d754](https://github.com/mohatt/gatsby-plugin-postbuild/commit/8f6d754aa7f80b11af6de072d02c8b1916800e67))

# [2.2.0](https://github.com/mohatt/gatsby-plugin-postbuild/compare/v2.1.1...v2.2.0) (2021-04-05)


### Features

* **plugin:** allow passing options to file transformers ([fe0d323](https://github.com/mohatt/gatsby-plugin-postbuild/commit/fe0d3238e6519ab505094b344a310decc12491a5))
* **plugin:** disallow processing `___gatsby` node and its descendants by default ([b9709a0](https://github.com/mohatt/gatsby-plugin-postbuild/commit/b9709a07492d4dacdc2b8907f83fe7fe24a7b79d))
* **task:minify:** add new task for minifying inline html assets ([bde1f9c](https://github.com/mohatt/gatsby-plugin-postbuild/commit/bde1f9c20f89c290e6f9de76498fb922969d1819))


### Performance Improvements

* **plugin:** update type declarations ([6b50078](https://github.com/mohatt/gatsby-plugin-postbuild/commit/6b50078ec50b729148a2cf933f0351791a2d6ed3))
* **task:purgecss:** use Promise.map for purging styles ([ad4ab7b](https://github.com/mohatt/gatsby-plugin-postbuild/commit/ad4ab7b94afa29ee96a36b3cd55fa28e045e5607))

## [2.1.1](https://github.com/mohatt/gatsby-plugin-postbuild/compare/v2.1.0...v2.1.1) (2021-03-18)


### Performance Improvements

* **plugin:** use chalk instead of plain ANSI codes ([b6a8261](https://github.com/mohatt/gatsby-plugin-postbuild/commit/b6a8261ea14b7ad762a587bcf3aff7f59c540518))

# [2.1.0](https://github.com/mohatt/gatsby-plugin-postbuild/compare/v2.0.0...v2.1.0) (2021-03-17)


### Features

* **plugin:** add type declarations ([0aa8210](https://github.com/mohatt/gatsby-plugin-postbuild/commit/0aa821012435685068203bc7a907f5908907e050))

# [2.0.0](https://github.com/mohatt/gatsby-plugin-postbuild/compare/v1.2.2...v2.0.0) (2021-03-14)

### BREAKING CHANGES

* **plugin:** The plugin options schema has been changed


### Features

* **task:netlify-headers:** add header merging functionality ([fbbb0d6](https://github.com/mohatt/gatsby-plugin-postbuild/commit/fbbb0d674eac94492daf93897161de0002f9b78c))
* **task:netlify-headers:** add link priority for sorting Link headers ([bd5f82e](https://github.com/mohatt/gatsby-plugin-postbuild/commit/bd5f82ed3f4d29eb0bd181ded3925449160de656))
* **task:netlify-headers:** add option `transformPathLinks` for manipulating links under each path ([bc144d0](https://github.com/mohatt/gatsby-plugin-postbuild/commit/bc144d0ea329636be020db9319a7b2ea33419f20))
* **task:netlify-headers:** add support for `prerender` links ([c491491](https://github.com/mohatt/gatsby-plugin-postbuild/commit/c491491c85ecc4044321caf622d2ddea48b0672d))
* **task:netlify-headers:** support space delimited multi-value `rel` attribute ([36131c9](https://github.com/mohatt/gatsby-plugin-postbuild/commit/36131c93d71539b60d48a6c5532755d8d98a63f0))
* **plugin:** add `events` option to allow custom events to be added as a `user` task ([f9fc71e](https://github.com/mohatt/gatsby-plugin-postbuild/commit/f9fc71eda41652a2ef8dba742615959b2a2c156d))
* **plugin:** add `html.pagePath` to get the path of the current html file ([c6dfbb3](https://github.com/mohatt/gatsby-plugin-postbuild/commit/c6dfbb3b774697acbc0818d0338fa13c8e6e381e))
* **plugin:** add `netlify-headers` task ([38dbec3](https://github.com/mohatt/gatsby-plugin-postbuild/commit/38dbec36f825936cc030a907ab64c8265171dc89))
* **plugin:** add event `ext.configure` that allows tasks to change processing options for different extensions ([edc3d10](https://github.com/mohatt/gatsby-plugin-postbuild/commit/edc3d10417ccae03d936ac076f56890b5f761899))
* **plugin:** add html.write event ([021e87d](https://github.com/mohatt/gatsby-plugin-postbuild/commit/021e87d7e5a962d84d6d6cffcf2fcdc3f7a1952d))
* **plugin:** allow customizing concurrency and processing strategy on a per extension basis ([0a364f9](https://github.com/mohatt/gatsby-plugin-postbuild/commit/0a364f9e1199f94a3dcbc423b09442413e7912a0))
* **plugin:** implemented tasks api ([9facd94](https://github.com/mohatt/gatsby-plugin-postbuild/commit/9facd94df0a572d26f8081c38635c09484a4af4d))
* **plugin:** The plugin is now written in Typescript ([83013f7](https://github.com/mohatt/gatsby-plugin-postbuild/commit/83013f78f26955db03d7d304e4f93f9f7ea11365))


### Bug Fixes

* **plugin:** add `ext.configure` event to plugin options schema ([9d6d8cd](https://github.com/mohatt/gatsby-plugin-postbuild/commit/9d6d8cd14570c833e480c7b1721f8e206a249eb5))
* **plugin:** correctly handle both 404 and 404.html ([1242415](https://github.com/mohatt/gatsby-plugin-postbuild/commit/124241514e4ce85b5b004d6f57b806010c6c5594))
* **plugin:** fix `concurrency` option ([04d8fc6](https://github.com/mohatt/gatsby-plugin-postbuild/commit/04d8fc69080a16e0204101b7e0579e72a2c60e78))
* **plugin:** fix glob matches sorting ([6f07e36](https://github.com/mohatt/gatsby-plugin-postbuild/commit/6f07e369fd47e71c4f7cff692895ce6a85a1878d))
* **plugin:** fix incorrect file size for updated files ([b29e89f](https://github.com/mohatt/gatsby-plugin-postbuild/commit/b29e89f0c4f943486ecc769685d47d4e8609fe86))
* **plugin:** ignore running when there is no enabled tasks ([c6514b5](https://github.com/mohatt/gatsby-plugin-postbuild/commit/c6514b554b43e80047e02e2469176bbfc09db58f))
* **plugin:** sort matches found by glob ([a561b59](https://github.com/mohatt/gatsby-plugin-postbuild/commit/a561b5961c641f4f87b63c30638fceba1c0d13ed))
* **task:purgecss:** fix purgecss types ([b97d36b](https://github.com/mohatt/gatsby-plugin-postbuild/commit/b97d36b8b1727af4203f748479404333e4847c84))
* **task:netlify-headers:** don't remove links with unsupported rel types ([adc126b](https://github.com/mohatt/gatsby-plugin-postbuild/commit/adc126bf08761a52fbf0b6a9ce2f3a8f64a51d1c))
* **task:purgecss:** no need to export DI container ([9981160](https://github.com/mohatt/gatsby-plugin-postbuild/commit/9981160b58a6dda600d0e6e07e283930d5989ef2))


### Performance Improvements

* **deps:** no need for `glob-to-regexp` anymore ([cda1d2d](https://github.com/mohatt/gatsby-plugin-postbuild/commit/cda1d2d86efc0994482813416d91488474770d35))
* **plugin:** change `defaultConcurrency` to 10 ([3c01272](https://github.com/mohatt/gatsby-plugin-postbuild/commit/3c01272d0949919d9eed918fa9e620354070f1f8))
* **plugin:** check for empty events options before adding `user` task ([2602f46](https://github.com/mohatt/gatsby-plugin-postbuild/commit/2602f46ad57d3e64a028e896d1c599b728e5e2be))
* **plugin:** merge `report` and `consoleReport` options in one option `reporting` ([cd83e3a](https://github.com/mohatt/gatsby-plugin-postbuild/commit/cd83e3a960ff910f50a1de6156e52350b076c817))
* **plugin:** move `on.shutdown` event to `Postbuild.run` method ([d64d4e8](https://github.com/mohatt/gatsby-plugin-postbuild/commit/d64d4e86819898aebe1ae72bfa2080f6a7fb4ce6))
* **plugin:** move `processFiles` outside of `postbuild.run` ([8c65b67](https://github.com/mohatt/gatsby-plugin-postbuild/commit/8c65b6778506e7bdaeb93d258b04ab3f3b369b45))
* **plugin:** optimized tasks api ([6ded889](https://github.com/mohatt/gatsby-plugin-postbuild/commit/6ded8895b70b948d1acdac70daad80e62a12d585))
* **plugin:** remove file.getEventPayload and use a class property instead ([2af57c4](https://github.com/mohatt/gatsby-plugin-postbuild/commit/2af57c45cbfcce719d2ce8547cc4ee3aa3edaad5))
* **plugin:** rename `file` events to `glob` ([fed250f](https://github.com/mohatt/gatsby-plugin-postbuild/commit/fed250fb39b91728f9c95463ad308c1b7b02b8a2))
* **plugin:** Replace option.purgecss.rejected with options.reportRejected ([f8e4a91](https://github.com/mohatt/gatsby-plugin-postbuild/commit/f8e4a91c33e93ce6c6b8961aa9f0610c30084d90))
* **plugin:** support checking for a list of extensions ([a942e03](https://github.com/mohatt/gatsby-plugin-postbuild/commit/a942e0327e24c186b9578d5133c753c6ff5410b2))
* **plugin:** use import type when possible ([5410d4b](https://github.com/mohatt/gatsby-plugin-postbuild/commit/5410d4b2613017858d068f922e8e1af527d71af7))
* **plugin:** use one event to handle generic files since we dont need to retain their data ([daea1ba](https://github.com/mohatt/gatsby-plugin-postbuild/commit/daea1ba46df905cf0e99671aad77d27f5041f580))
* **plugin:** no need to include current `task` in event payload ([3fda7ed](https://github.com/mohatt/gatsby-plugin-postbuild/commit/3fda7ed9de0201d9ae80512041263373bf565bde))
* **task:purgecss:** rename `reportRejected` to `writeRejected` and set it to `false` by default ([23488f5](https://github.com/mohatt/gatsby-plugin-postbuild/commit/23488f5ee1223a2a6e503e7fae467166390aa399))

## [1.2.2](https://github.com/mohatt/gatsby-plugin-postbuild/compare/v1.2.1...v1.2.2) (2021-02-20)


### Bug Fixes

* **plugin:** avoid mutating options.purgecss ([230c4c6](https://github.com/mohatt/gatsby-plugin-postbuild/commit/230c4c6908d296e74c425466b0296d601b2ebb22))

## [1.2.1](https://github.com/mohatt/gatsby-plugin-postbuild/compare/v1.2.0...v1.2.1) (2021-02-17)


### Bug Fixes

* **plugin:** check for assets extension before adding them ([fcfd24b](https://github.com/mohatt/gatsby-plugin-postbuild/commit/fcfd24b4987454bb08259266c27e5acd2cbecf2e))
* **plugin:** fix a minor bug when loading ignored files ([77dd129](https://github.com/mohatt/gatsby-plugin-postbuild/commit/77dd129824aa55dd48267308bb45e386e2b7f6d7))


### Performance Improvements

* **plugin:** ignore loading webpack chunks if no webpack ignores is defined ([d116e4c](https://github.com/mohatt/gatsby-plugin-postbuild/commit/d116e4c65a026343ee166226e3a7c9a2dea335b8))


### Reverts

* "chore(test): setup tests to run on both node 10 and 12" ([e1faad9](https://github.com/mohatt/gatsby-plugin-postbuild/commit/e1faad919691fbcccb27aa2cdedd8677a49b59bc))

# [1.2.0](https://github.com/mohatt/gatsby-plugin-postbuild/compare/v1.1.3...v1.2.0) (2021-02-16)


### Bug Fixes

* **plugin:** remove unused class method ([daa1ec3](https://github.com/mohatt/gatsby-plugin-postbuild/commit/daa1ec314ef5b30a017b83e3e35805de30101bef))
* **plugin:** use _.mergeWith with a customizer to avoid merging arrays by index ([ee4a3cd](https://github.com/mohatt/gatsby-plugin-postbuild/commit/ee4a3cda9a56d4561994434151b5f814b03fab71))


### Features

* **plugin:** add the ability to exclude webpack chunks, pages, css and js files from optimization ([ab43853](https://github.com/mohatt/gatsby-plugin-postbuild/commit/ab43853831399d0a773a9fc1950b5a38b143a3bc))


### Performance Improvements

* **plugin:** rename purgecss.allowSymbols to allowSymbols since its not being passed to purgecss ([12acc1a](https://github.com/mohatt/gatsby-plugin-postbuild/commit/12acc1a12a805c99a8c8f9ea731bdb1871ba5123))

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
