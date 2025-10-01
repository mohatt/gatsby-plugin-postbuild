// Register all vitest-memfs matchers
import 'vitest-memfs/setup'

// Use virtual file system for testing (see /__mocks__/fs)
vi.mock('fs')
vi.mock('fs/promises')

vi.mock('webpack-assets-manifest')
