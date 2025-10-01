import { testE2E, testHeaders } from '@test/util'

describe('incremental build', () => {
  it('works correctly', async () => {
    await testE2E(
      'incremental build',
      {
        minify: {
          enabled: true,
        },
        'http-headers': {
          enabled: true,
          headers: testHeaders,
        },
      },
      false,
    )
  })
})
