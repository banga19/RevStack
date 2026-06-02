/**
 * Generate PWA icons as minimal valid PNG files.
 * This creates solid-color placeholder icons with the brain SVG
 * to be served as PWA icons.
 *
 * In production, replace these with the actual rendered SVG as PNG.
 */

const fs = require("fs")
const path = require("path")

const SIZES = [192, 512]
const COLOR = "#7C3AED" // Primary purple
const ICONS_DIR = path.join(__dirname, "..", "public", "icons")

// Minimal valid 1x1 PNG (will serve as placeholder)
// Modern browsers will use the SVG icon from the manifest instead
function createMinimalPNG(size) {
  // Create a minimal 1x1 transparent PNG as a placeholder
  // The SVG icon in the manifest will be used by modern browsers
  const png = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, // PNG signature
    0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk
    0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, // width = 1
    0x00, 0x00, 0x00, 0x01, // height = 1
    0x08, 0x02, // bit depth = 8, color type = RGB
    0x00, 0x00, 0x00, // compression, filter, interlace
    0x90, 0x77, 0x53, 0xDE, // CRC
    0x00, 0x00, 0x00, 0x0C, // IDAT chunk
    0x49, 0x44, 0x41, 0x54,
    0x08, 0xD7, 0x63, 0x60, 0x60, 0x60, 0x00, 0x00, 0x00, 0x04, 0x00, 0x01,
    0x27, 0x34, 0x27, 0x8F, // CRC
    0x00, 0x00, 0x00, 0x00, // IEND
    0x49, 0x45, 0x4E, 0x44,
    0xAE, 0x42, 0x60, 0x82,
  ])

  const filename = path.join(ICONS_DIR, `icon-${size}x${size}.png`)
  // Write the same 1x1 PNG for all sizes (placeholder)
  // The SVG icon is the real icon that browsers will use
  fs.writeFileSync(filename, png)
  console.log(`  ✓ ${filename}`)
}

console.log("Generating PWA icons...")

// Ensure directory exists
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true })
}

// Create placeholder PNGs for each size
SIZES.forEach((size) => createMinimalPNG(size))

console.log("Done! Modern browsers will use the SVG icon from manifest.json.")
console.log("For production, replace these with proper rendered PNGs.")
