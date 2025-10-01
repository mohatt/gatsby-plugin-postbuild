import { testPluginOptionsSchema } from 'gatsby-plugin-utils'
import { pluginOptionsSchema } from '@postbuild/gatsby-node'
import optionsFixtures from './__fixtures__/options'

describe('options schema', () => {
  it.each(optionsFixtures)('$title', async ({ options }) => {
    const { isValid, errors } = await testPluginOptionsSchema(pluginOptionsSchema, options as any)
    expect(isValid).toMatchSnapshot()
    expect(errors).toMatchSnapshot()
  })
})
