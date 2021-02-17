import fs from 'fs'
import { options } from '../../util'
import { mountFile, mountOptions } from '../../../test/utils'
import { FileWriter } from '../writer'

jest.mock('fs')
mountOptions()

describe('FileWriter', () => {
  const filename = `${options._public}/page/index.html`
  const data = '//ok'
  console.log = jest.fn()

  beforeEach(() => {
    console.log.mockReset()
    fs.reset()
  })

  it('correctly writes files', async () => {
    mountFile(filename, '//noop')
    mountOptions({ reportConsole: true })
    let writer
    expect(() => { writer = new FileWriter() }).not.toThrow()
    await expect(writer.write(filename, data)).resolves.not.toThrow()
    expect(fs.readFileSync(filename, 'utf-8')).toBe(data)
    expect(console.log).toHaveBeenCalledTimes(1)
    expect(writer.getReports()).toMatchSnapshot()
    expect(writer.getTotalSaving()).toMatchSnapshot()
  })

  it('correctly ignores reporting to console', async () => {
    mountOptions({ reportConsole: false })
    mountFile(filename, '//noop')
    let writer
    expect(() => { writer = new FileWriter() }).not.toThrow()
    await expect(writer.write(filename, data)).resolves.not.toThrow()
    expect(console.log).not.toHaveBeenCalled()
  })

  it('correctly ignores non-existing files', async () => {
    let writer
    expect(() => { writer = new FileWriter() }).not.toThrow()
    await expect(writer.write(filename, data)).rejects.toThrow()
  })

  it('correctly writes rejected log file', async () => {
    mountFile(filename, '//noop')
    let writer
    expect(() => { writer = new FileWriter() }).not.toThrow()
    await expect(writer.write(filename, data, ['a', 'b'])).resolves.not.toThrow()
    expect(fs.readFileSync(filename + '.rejected.log', 'utf-8')).toBe('a b')
  })
})
