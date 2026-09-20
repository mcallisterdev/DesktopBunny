import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const outDir = join(scriptDir, '..', 'resources')
mkdirSync(outDir, { recursive: true })

function crc32(buffer) {
  let crc = ~0
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i]
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
  }
  return (~crc) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([length, body, crc])
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ])
}

function makeIcon(size) {
  const pixels = Buffer.alloc(size * size * 4)
  const scale = size / 32

  const setPixel = (x, y, color) => {
    const px = Math.round(x)
    const py = Math.round(y)
    if (px < 0 || py < 0 || px >= size || py >= size) return
    const index = (py * size + px) * 4
    pixels[index] = color[0]
    pixels[index + 1] = color[1]
    pixels[index + 2] = color[2]
    pixels[index + 3] = color[3]
  }

  const fillEllipse = (cx, cy, rx, ry, color) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
        const dx = (x - cx) / rx
        const dy = (y - cy) / ry
        if (dx * dx + dy * dy <= 1) setPixel(x, y, color)
      }
    }
  }

  const fur = [201, 138, 91, 255]
  const inner = [243, 233, 220, 255]
  const eye = [40, 30, 25, 255]

  fillEllipse(11 * scale, 9 * scale, 2.6 * scale, 8 * scale, fur)
  fillEllipse(21 * scale, 9 * scale, 2.6 * scale, 8 * scale, fur)
  fillEllipse(16 * scale, 19 * scale, 9 * scale, 8 * scale, fur)
  fillEllipse(16 * scale, 22 * scale, 5 * scale, 4 * scale, inner)
  fillEllipse(12.6 * scale, 17 * scale, 1.4 * scale, 1.7 * scale, eye)
  fillEllipse(19.4 * scale, 17 * scale, 1.4 * scale, 1.7 * scale, eye)

  return encodePng(size, size, pixels)
}

writeFileSync(join(outDir, 'tray.png'), makeIcon(32))
writeFileSync(join(outDir, 'icon.png'), makeIcon(1024))

console.log(`Wrote icons to ${outDir}`)
