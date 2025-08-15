import path from 'path'

export const graphql = vi.fn()
export const withPrefix = vi
  .fn()
  .mockImplementation((pathname: string) => path.join('/site', pathname))
