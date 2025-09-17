/**
 * Color extraction utilities for brand asset detection
 */

/**
 * Convert RGB to Hex color format
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

/**
 * Parse color string to hex format
 */
export function parseColorToHex(color: string): string | null {
  if (!color) return null
  
  // Already hex
  if (color.startsWith('#')) {
    // Expand shorthand hex (#fff -> #ffffff)
    if (color.length === 4) {
      return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3]
    }
    return color.toLowerCase()
  }
  
  // RGB/RGBA format
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (rgbMatch) {
    return rgbToHex(
      parseInt(rgbMatch[1]),
      parseInt(rgbMatch[2]),
      parseInt(rgbMatch[3])
    )
  }
  
  // HSL format - convert to RGB then hex
  const hslMatch = color.match(/hsla?\((\d+),\s*(\d+)%,\s*(\d+)%/)
  if (hslMatch) {
    const [r, g, b] = hslToRgb(
      parseInt(hslMatch[1]) / 360,
      parseInt(hslMatch[2]) / 100,
      parseInt(hslMatch[3]) / 100
    )
    return rgbToHex(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255))
  }
  
  return null
}

/**
 * Convert HSL to RGB
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r, g, b

  if (s === 0) {
    r = g = b = l // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1/6) return p + (q - p) * 6 * t
      if (t < 1/2) return q
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }

  return [r, g, b]
}

/**
 * Check if color is grayscale
 */
export function isGrayscale(hexColor: string): boolean {
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  
  // Check if RGB values are similar (within threshold)
  const threshold = 20
  return Math.abs(r - g) < threshold && 
         Math.abs(g - b) < threshold && 
         Math.abs(r - b) < threshold
}

/**
 * Check if color is too light (near white)
 */
export function isTooLight(hexColor: string): boolean {
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  
  // Check if all values are above threshold
  const threshold = 240
  return r > threshold && g > threshold && b > threshold
}

/**
 * Check if color is too dark (near black)
 */
export function isTooDark(hexColor: string): boolean {
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  
  // Check if all values are below threshold
  const threshold = 30
  return r < threshold && g < threshold && b < threshold
}

/**
 * Filter and deduplicate colors
 */
export function filterBrandColors(colors: string[]): string[] {
  const hexColors = colors
    .map(c => parseColorToHex(c))
    .filter((c): c is string => c !== null)
  
  // Remove duplicates
  const unique = [...new Set(hexColors)]
  
  // Filter out grayscale, too light, and too dark colors
  const brandColors = unique.filter(color => 
    !isGrayscale(color) && 
    !isTooLight(color) && 
    !isTooDark(color)
  )
  
  // If we have too few brand colors, include some filtered ones
  if (brandColors.length < 2 && unique.length > brandColors.length) {
    // Add the most saturated grayscale colors
    const grayColors = unique.filter(color => 
      isGrayscale(color) && !isTooLight(color) && !isTooDark(color)
    )
    brandColors.push(...grayColors.slice(0, 2 - brandColors.length))
  }
  
  // Limit to 5 colors max
  return brandColors.slice(0, 5)
}

/**
 * Extract colors from CSS text
 */
export function extractColorsFromCSS(cssText: string): string[] {
  const colors: string[] = []
  
  // Match hex colors
  const hexMatches = cssText.match(/#[0-9a-fA-F]{3,6}\b/g) || []
  colors.push(...hexMatches)
  
  // Match rgb/rgba colors
  const rgbMatches = cssText.match(/rgba?\([^)]+\)/g) || []
  colors.push(...rgbMatches)
  
  // Match hsl/hsla colors
  const hslMatches = cssText.match(/hsla?\([^)]+\)/g) || []
  colors.push(...hslMatches)
  
  return colors
}