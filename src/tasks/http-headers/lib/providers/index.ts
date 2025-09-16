import Provider from './base'
import FirebaseProvider from './firebase'
import NetlifyProvider from './netlify'
import VercelProvider from './vercel'

export enum ProviderSymbol {
  Netlify = 'netlify',
  Vercel = 'vercel',
  Firebase = 'firebase',
}

export const SUPPORTS: { [ext: string]: typeof Provider } = {
  [ProviderSymbol.Netlify]: NetlifyProvider,
  [ProviderSymbol.Vercel]: VercelProvider,
  [ProviderSymbol.Firebase]: FirebaseProvider,
}

export { Provider }
export type { IProviderArtifact } from './base'
export default Provider
