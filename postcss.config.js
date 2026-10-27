// Load Tailwind from THIS project's node_modules only (never a parent folder),
// and fail with a readable message if the wrong major version is installed.
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
const dir = path.resolve(import.meta.dirname, 'node_modules/tailwindcss')

let version
try {
  version = require(path.join(dir, 'package.json')).version
} catch {
  throw new Error('tailwindcss is not installed in ./node_modules. Run: npm ci')
}
if (!version.startsWith('3.')) {
  throw new Error(
    `This project needs tailwindcss 3.x but ./node_modules has ${version}. ` +
      'Delete node_modules and run: npm ci',
  )
}

export default { plugins: [require(dir), require('autoprefixer')] }
