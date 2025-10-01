import Provider from './base'
import FirebaseProvider from './firebase'
import NetlifyProvider from './netlify'
import VercelProvider from './vercel'

export type ProviderType = 'netlify' | 'vercel' | 'firebase'

export const PROVIDER_TYPES: ProviderType[] = ['netlify', 'vercel', 'firebase']

export const SUPPORTS: { [k in ProviderType]: typeof Provider } = {
  netlify: NetlifyProvider,
  vercel: VercelProvider,
  firebase: FirebaseProvider,
}

export { Provider }
export type { IProviderArtifact } from './base'
export default Provider
