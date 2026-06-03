/**
 * Generate proper PWA icons as valid PNG files.
 *
 * This creates solid-color placeholder PNGs with an embedded "M" letterform
 * using raw pixel data. In production, replace these with professionally
 * designed icons.
 *
 * Usage: node scripts/generate-pwa-icons.js
 */

const fs = require("fs")
const path = require("path")
const zlib = require("zlib")

const SIZES = [192, 512]
const ICONS_DIR = path.join(__dirname, "..", "public", "icons")
const PRIMARY_COLOR = [124, 58, 237] // #7C3AED purple
const DARK_COLOR = [109, 40, 217]     // #6D28D9 darker purple
const ACCENT_COLOR = [167, 139, 250]   // #A78BFA light purple
const WHITE = [255, 255, 255]
const TRANSPARENT = [0, 0, 0, 0]

/**
 * Create a CRC32 checksum (used in PNG chunks).
 */
function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xEDB88320 : crc >>> 1
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

/**
 * Create a PNG chunk: length (4 bytes) + type (4 bytes) + data + CRC (4 bytes).
 */
function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii")
  const lengthBuf = Buffer.alloc(4)
  lengthBuf.writeUInt32BE(data.length)
  const crcInput = Buffer.concat([typeBuf, data])
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(crcInput))
  return Buffer.concat([lengthBuf, typeBuf, data, crcBuf])
}

/**
 * Generate a solid-color PNG with a simple "M" letterform at the given size.
 */
function generatePng(size) {
  // Create RGBA pixel data (4 bytes per pixel)
  const pixels = Buffer.alloc(size * size * 4, 255)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const cx = x / size
      const cy = y / size

      // Rounded rectangle background
      const margin = size * 0.08
      const radius = size * 0.18
      const rx = Math.min(x, size - x)
      const ry = Math.min(y, size - y)
      const dist = Math.min(rx, ry)
      const isInside = x >= margin && x < size - margin && y >= margin && y < size - margin

      // Corner rounding
      let inCorner = true
      if (x < margin + radius && y < margin + radius) {
        inCorner = Math.sqrt((x - (margin + radius)) ** 2 + (y - (margin + radius)) ** 2) <= radius
      } else if (x >= size - margin - radius && y < margin + radius) {
        inCorner = Math.sqrt((x - (size - margin - radius)) ** 2 + (y - (margin + radius)) ** 2) <= radius
      } else if (x < margin + radius && y >= size - margin - radius) {
        inCorner = Math.sqrt((x - (margin + radius)) ** 2 + (y - (size - margin - radius)) ** 2) <= radius
      } else if (x >= size - margin - radius && y >= size - margin - radius) {
        inCorner = Math.sqrt((x - (size - margin - radius)) ** 2 + (y - (size - margin - radius)) ** 2) <= radius
      }

      if (!isInside || !inCorner) {
        pixels[idx] = 0
        pixels[idx + 1] = 0
        pixels[idx + 2] = 0
        pixels[idx + 3] = 0
        continue
      }

      // Gradient from center
      const centerX = size / 2
      const centerY = size / 2
      const distFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2) / (size * 0.5)

      pixels[idx] = Math.round(PRIMARY_COLOR[0] + (DARK_COLOR[0] - PRIMARY_COLOR[0]) * distFromCenter * 0.3)
      pixels[idx + 1] = Math.round(PRIMARY_COLOR[1] + (DARK_COLOR[1] - PRIMARY_COLOR[1]) * distFromCenter * 0.3)
      pixels[idx + 2] = Math.round(PRIMARY_COLOR[2] + (DARK_COLOR[2] - PRIMARY_COLOR[2]) * distFromCenter * 0.3)
      pixels[idx + 3] = 255

      // Draw a simple "M" letterform in the center
      const letterWidth = size * 0.55
      const letterHeight = size * 0.55
      const letterLeft = (size - letterWidth) / 2
      const letterTop = (size - letterHeight) / 2
      const lx = x - letterLeft
      const ly = y - letterTop
      const strokeW = Math.max(3, size * 0.06)

      // M shape: two vertical lines on left and right, two angled lines in center
      // Left vertical
      if (lx >= 0 && lx <= strokeW && ly >= 0 && ly <= letterHeight) {
        pixels[idx] = WHITE[0]
        pixels[idx + 1] = WHITE[1]
        pixels[idx + 2] = WHITE[2]
      }
      // Right vertical
      else if (lx >= letterWidth - strokeW && lx <= letterWidth && ly >= 0 && ly <= letterHeight) {
        pixels[idx] = WHITE[0]
        pixels[idx + 1] = WHITE[1]
        pixels[idx + 2] = WHITE[2]
      }
      // Left diagonal (from top-left to center-bottom)
      else {
        const midX = letterWidth / 2
        const midY = letterHeight
        // Line from (0, 0) to (midX, midY)
        const t1 = ly / midY
        const expectedX1 = t1 * midX
        if (t1 >= 0 && t1 <= 1 && Math.abs(lx - expectedX1) <= strokeW) {
          pixels[idx] = WHITE[0]
          pixels[idx + 1] = WHITE[1]
          pixels[idx + 2] = WHITE[2]
        }
        // Right diagonal (from top-right to center-bottom)
        const t2 = ly / midY
        const expectedX2 = letterWidth - t2 * midX
        if (t2 >= 0 && t2 <= 1 && Math.abs(lx - expectedX2) <= strokeW) {
          pixels[idx] = WHITE[0]
          pixels[idx + 1] = WHITE[1]
          pixels[idx + 2] = WHITE[2]
        }
      }
    }
  }

  // Convert RGBA to filtered raw data for IDAT
  // Use filter byte 0 (None) for each row
  const rawData = Buffer.alloc(size * (1 + size * 4))
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4)
    rawData[rowStart] = 0 // filter: None
    for (let x = 0; x < size; x++) {
      const pixelIdx = (y * size + x) * 4
      const rawOffset = rowStart + 1 + x * 4
      rawData[rawOffset] = pixels[pixelIdx]
      rawData[rawOffset + 1] = pixels[pixelIdx + 1]
      rawData[rawOffset + 2] = pixels[pixelIdx + 2]
      rawData[rawOffset + 3] = pixels[pixelIdx + 3]
    }
  }

  // Compress the raw data with zlib
  const compressed = zlib.deflateSync(rawData)

  // Build IHDR data
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(size, 0)   // width
  ihdrData.writeUInt32BE(size, 4)   // height
  ihdrData[8] = 8                     // bit depth
  ihdrData[9] = 6                     // color type: RGBA
  ihdrData[10] = 0                    // compression
  ihdrData[11] = 0                    // filter
  ihdrData[12] = 0                    // interlace

  // Build complete PNG
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
  const ihdr = pngChunk("IHDR", ihdrData)
  const idat = pngChunk("IDAT", compressed)
  const iend = pngChunk("IEND", Buffer.alloc(0))

  const filename = path.join(ICONS_DIR, `icon-${size}x${size}.png`)
  fs.writeFileSync(filename, Buffer.concat([signature, ihdr, idat, iend]))
  console.log(`  ✓ ${filename} (${size}x${size})`)
}

console.log("Generating PWA icons...\n")

// Ensure directory exists
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true })
}

// Generate PNGs for each size
SIZES.forEach((size) => generatePng(size))

console.log("\nDone! Icons generated for PWA.")
console.log("For production, replace these with properly designed icons.")
