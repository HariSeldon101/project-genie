/**
 * CSS Variable and Custom Property Extractor
 * Extracts CSS variables, gradients, and theme colors from websites
 */

import { Page } from 'playwright'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export interface CSSVariables {
  colors: Record<string, string>
  gradients: string[]
  fonts: Record<string, string>
  spacing: Record<string, string>
  shadows: Record<string, string>
  other: Record<string, string>
}

export class CSSVariableExtractor {
  private page: Page

  constructor(page: Page) {
    this.page = page
  }

  async extractCSSVariables(): Promise<CSSVariables> {
    permanentLogger.info('CSS_VARIABLE_EXTRACTOR', 'Extracting CSS variables and custom properties')

    const variables = await this.page.evaluate(() => {
      const result: CSSVariables = {
        colors: {},
        gradients: [],
        fonts: {},
        spacing: {},
        shadows: {},
        other: {}
      }

      // Helper to check if value is a color
      const isColor = (value: string): boolean => {
        return /^(#|rgb|rgba|hsl|hsla|color)/.test(value.trim()) ||
               /^(transparent|currentColor|inherit)$/i.test(value.trim()) ||
               /^(aliceblue|antiquewhite|aqua|aquamarine|azure|beige|bisque|black|blanchedalmond|blue|blueviolet|brown|burlywood|cadetblue|chartreuse|chocolate|coral|cornflowerblue|cornsilk|crimson|cyan|darkblue|darkcyan|darkgoldenrod|darkgray|darkgreen|darkgrey|darkkhaki|darkmagenta|darkolivegreen|darkorange|darkorchid|darkred|darksalmon|darkseagreen|darkslateblue|darkslategray|darkslategrey|darkturquoise|darkviolet|deeppink|deepskyblue|dimgray|dimgrey|dodgerblue|firebrick|floralwhite|forestgreen|fuchsia|gainsboro|ghostwhite|gold|goldenrod|gray|green|greenyellow|grey|honeydew|hotpink|indianred|indigo|ivory|khaki|lavender|lavenderblush|lawngreen|lemonchiffon|lightblue|lightcoral|lightcyan|lightgoldenrodyellow|lightgray|lightgreen|lightgrey|lightpink|lightsalmon|lightseagreen|lightskyblue|lightslategray|lightslategrey|lightsteelblue|lightyellow|lime|limegreen|linen|magenta|maroon|mediumaquamarine|mediumblue|mediumorchid|mediumpurple|mediumseagreen|mediumslateblue|mediumspringgreen|mediumturquoise|mediumvioletred|midnightblue|mintcream|mistyrose|moccasin|navajowhite|navy|oldlace|olive|olivedrab|orange|orangered|orchid|palegoldenrod|palegreen|paleturquoise|palevioletred|papayawhip|peachpuff|peru|pink|plum|powderblue|purple|rebeccapurple|red|rosybrown|royalblue|saddlebrown|salmon|sandybrown|seagreen|seashell|sienna|silver|skyblue|slateblue|slategray|slategrey|snow|springgreen|steelblue|tan|teal|thistle|tomato|turquoise|violet|wheat|white|whitesmoke|yellow|yellowgreen)$/i.test(value.trim())
      }

      // Helper to check if value is a gradient
      const isGradient = (value: string): boolean => {
        return /gradient\(/.test(value)
      }

      // Helper to check if value is a font
      const isFont = (value: string): boolean => {
        return /^(\d+px|rem|em|%)|^(normal|bold|lighter|bolder|\d{3})/.test(value) ||
               value.includes('font') || value.includes('serif') || 
               value.includes('sans') || value.includes('mono')
      }

      // Helper to check if value is spacing
      const isSpacing = (value: string): boolean => {
        return /^(-?\d+(\.\d+)?(px|rem|em|vh|vw|%|ch))$/.test(value.trim())
      }

      // Helper to check if value is shadow
      const isShadow = (value: string): boolean => {
        return value.includes('shadow') || 
               (value.includes('px') && value.split(' ').length >= 3)
      }

      // Extract CSS variables from :root and other elements
      const extractFromStyleSheets = () => {
        for (const sheet of document.styleSheets) {
          try {
            const rules = sheet.cssRules || sheet.rules
            if (!rules) continue

            for (const rule of rules) {
              if (rule.type === CSSRule.STYLE_RULE) {
                const styleRule = rule as CSSStyleRule
                
                // Check for CSS variables
                for (let i = 0; i < styleRule.style.length; i++) {
                  const prop = styleRule.style[i]
                  if (prop.startsWith('--')) {
                    const value = styleRule.style.getPropertyValue(prop).trim()
                    
                    // Categorize the variable
                    if (isGradient(value)) {
                      result.gradients.push(value)
                    } else if (isColor(value)) {
                      result.colors[prop] = value
                    } else if (isFont(value)) {
                      result.fonts[prop] = value
                    } else if (isSpacing(value)) {
                      result.spacing[prop] = value
                    } else if (isShadow(value)) {
                      result.shadows[prop] = value
                    } else {
                      result.other[prop] = value
                    }
                  }
                }
              }
            }
          } catch (e) {
            // Cross-origin stylesheets may throw errors
            continue
          }
        }
      }

      // Extract computed CSS variables from root element
      const extractFromComputedStyles = () => {
        const root = document.documentElement
        const computedStyles = window.getComputedStyle(root)
        
        // Get all CSS variable properties
        for (const prop of Array.from(computedStyles)) {
          if (prop.startsWith('--')) {
            const value = computedStyles.getPropertyValue(prop).trim()
            
            if (isGradient(value)) {
              if (!result.gradients.includes(value)) {
                result.gradients.push(value)
              }
            } else if (isColor(value)) {
              result.colors[prop] = value
            } else if (isFont(value)) {
              result.fonts[prop] = value
            } else if (isSpacing(value)) {
              result.spacing[prop] = value
            } else if (isShadow(value)) {
              result.shadows[prop] = value
            } else {
              result.other[prop] = value
            }
          }
        }
      }

      // Extract gradients from backgrounds
      const extractGradients = () => {
        const elements = document.querySelectorAll('*')
        const foundGradients = new Set<string>()
        
        elements.forEach(el => {
          const styles = window.getComputedStyle(el)
          const background = styles.background || styles.backgroundImage
          
          if (background && isGradient(background)) {
            foundGradients.add(background)
          }
        })
        
        foundGradients.forEach(gradient => {
          if (!result.gradients.includes(gradient)) {
            result.gradients.push(gradient)
          }
        })
      }

      // Execute extraction
      extractFromStyleSheets()
      extractFromComputedStyles()
      extractGradients()

      return result
    })

    // Process and clean up the results
    const processed = this.processVariables(variables)

    permanentLogger.info('CSS_VARIABLE_EXTRACTOR', 'CSS variables extracted', {
      colorCount: Object.keys(processed.colors).length,
      gradientCount: processed.gradients.length,
      fontCount: Object.keys(processed.fonts).length,
      spacingCount: Object.keys(processed.spacing).length,
      shadowCount: Object.keys(processed.shadows).length,
      otherCount: Object.keys(processed.other).length
    })

    return processed
  }

  private processVariables(variables: CSSVariables): CSSVariables {
    // Convert CSS variable references to actual values
    const resolvedColors: Record<string, string> = {}
    
    for (const [key, value] of Object.entries(variables.colors)) {
      // If value is a var() reference, try to resolve it
      if (value.includes('var(')) {
        const match = value.match(/var\((--[\w-]+)\)/)
        if (match && variables.colors[match[1]]) {
          resolvedColors[key] = variables.colors[match[1]]
        } else {
          resolvedColors[key] = value
        }
      } else {
        resolvedColors[key] = value
      }
    }

    return {
      ...variables,
      colors: resolvedColors,
      // Limit gradients to unique values
      gradients: [...new Set(variables.gradients)].slice(0, 10)
    }
  }

  /**
   * Extract theme colors (primary, secondary, accent, etc.)
   */
  async extractThemeColors(): Promise<Record<string, string>> {
    const variables = await this.extractCSSVariables()
    const themeColors: Record<string, string> = {}

    // Common theme color patterns
    const themePatterns = [
      /primary/i,
      /secondary/i,
      /accent/i,
      /brand/i,
      /main/i,
      /success/i,
      /warning/i,
      /danger/i,
      /error/i,
      /info/i,
      /background/i,
      /foreground/i,
      /text/i,
      /border/i
    ]

    for (const [key, value] of Object.entries(variables.colors)) {
      for (const pattern of themePatterns) {
        if (pattern.test(key)) {
          const themeKey = key.replace('--', '').replace(/-/g, '_')
          themeColors[themeKey] = value
          break
        }
      }
    }

    return themeColors
  }
}