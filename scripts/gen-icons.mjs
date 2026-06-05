// One-off icon generator: rasterises scripts/icon-master.svg into the PNG
// app icons referenced by the web app manifest and iOS. Run with:
//   npm install --no-save sharp && node scripts/gen-icons.mjs
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const svg = readFileSync(resolve(here, 'icon-master.svg'))
const outDir = resolve(here, '..', 'public')

const targets = [
  { name: 'pwa-192.png', size: 192 },
  { name: 'pwa-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
]

for (const { name, size } of targets) {
  await sharp(svg, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(resolve(outDir, name))
  console.log(`wrote public/${name} (${size}x${size})`)
}
