import { testE2E } from '@test/util'

describe('task: minify', () => {
  it('works correctly', async () => {
    await testE2E('task: minify', {
      minify: {
        enabled: true,
      },
      ignore: ['extra.html'],
    })
  })
})
