declare module 'cssnano' {
  import Processor from 'postcss/lib/processor'
  interface cssnanoPlugin {
    (options: { preset?: string|any[]|Function|object, plugins?: any[] }): Processor
    postcss: boolean
  }
  const cssnano: cssnanoPlugin
  export default cssnano
}
