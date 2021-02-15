import fs from 'fs'
import { options } from '../util'
import { mountOptions } from '../../test/utils'
jest.mock('fs')

describe('onPreBootstrap', () => {
  it('correctly initializes default options', () => {
    expect(() => mountOptions()).not.toThrow()
    expect(options).toMatchSnapshot()
  })

  it('correctly initializes custom options', () => {
    expect(() => mountOptions({
      report: false,
      purgecss: {
        allowSymbols: true,
        rejected: false
      }
    })).not.toThrow()
    expect(options).toMatchSnapshot()
  })
})
