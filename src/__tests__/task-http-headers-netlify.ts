import { testE2E, testHeaders } from '@test/util'

describe('task: http-headers [netlify]', () => {
  it('works correctly', async () => {
    await testE2E('task: http-headers [netlify]', {
      'http-headers': {
        enabled: true,
        provider: 'netlify',
        headers: testHeaders,
      },
      ignore: ['extra.html'],
    })
  })
})
