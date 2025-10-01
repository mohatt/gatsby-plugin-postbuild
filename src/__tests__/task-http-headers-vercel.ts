import { testE2E, testHeaders } from '@test/util'

describe('task: http-headers [vercel]', () => {
  it('works correctly', async () => {
    await testE2E('task: http-headers [vercel]', {
      'http-headers': {
        enabled: true,
        provider: 'vercel',
        headers: testHeaders,
      },
      ignore: ['extra.html'],
    })
  })
})
