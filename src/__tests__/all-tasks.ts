import { testE2E, testHeaders } from '@test/util'

describe('all tasks', () => {
  it('works correctly', async () => {
    await testE2E('all tasks', {
      minify: {
        enabled: true,
      },
      'http-headers': {
        enabled: true,
        headers: testHeaders,
      },
      ignore: ['extra.html'],
    })
  })
})
