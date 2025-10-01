import { testE2E, testHeaders } from '@test/util'

describe('task: http-headers [firebase]', () => {
  it('works correctly', async () => {
    await testE2E('task: http-headers [firebase]', {
      'http-headers': {
        enabled: true,
        provider: 'firebase',
        headers: testHeaders,
      },
      ignore: ['extra.html'],
    })
  })
})
