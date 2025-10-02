import { resolve } from 'path'
import { defineConfig, defaultExclude } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['**/*.test.?(c|m)[jt]s?(x)', '**/__tests__/*.?(c|m)[jt]s?(x)'],
    exclude: [...defaultExclude, '**/__fixtures__'],
    globalSetup: ['./test/setup.ts'],
    setupFiles: ['./test/setup-test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.?(c|m)[jt]s?(x)'],
    },
    chaiConfig: {
      truncateThreshold: 500,
    },
  },
  resolve: {
    alias: {
      '@postbuild': resolve(__dirname, 'src'),
      '@test': resolve(__dirname, 'test'),
    },
  },
})
