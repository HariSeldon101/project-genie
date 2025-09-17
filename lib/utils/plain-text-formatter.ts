/**
 * Converts document content to plain text for PDF generation
 */

export class PlainTextFormatter {
  private static readonly INDENT = '    '
  
  public static format(content: any, documentType: string): string {
    try {
      console.log('PlainTextFormatter.format called with type:', documentType)
      console.log('Content type:', typeof content)
      
      if (!content) {
        console.log('Content is empty, returning empty string')
        return ''
      }
      
      // Parse content if it's a string
      if (typeof content === 'string') {
        console.log('Content is string, attempting to parse as JSON')
        try {
          content = JSON.parse(content)
          console.log('Successfully parsed JSON')
        } catch {
          console.log('Not JSON, returning cleaned text')
          // If not JSON, clean and return as text
          return this.cleanText(content)
        }
      }

      console.log('Formatting object...')
      // Convert object to formatted text
      const result = this.formatObject(content, 0)
      console.log('Formatting complete, result length:', result.length)
      return result
    } catch (error) {
      console.error('PlainTextFormatter.format error:', error)
      console.error('Error stack:', (error as Error).stack)
      return `Error formatting document content: ${(error as Error).message}`
    }
  }

  private static formatObject(obj: any, level: number = 0): string {
    if (!obj || typeof obj !== 'object') {
      return String(obj)
    }
    
    const sections = []
    const indent = this.INDENT.repeat(level)
    
    for (const [key, value] of Object.entries(obj)) {
      // Skip metadata fields
      if (key.startsWith('_') || key === 'metadata') continue
      
      const formattedKey = this.formatKey(key)
      
      if (value === null || value === undefined) {
        continue
      } else if (typeof value === 'string') {
        const cleanValue = this.cleanText(value)
        if (cleanValue) {
          sections.push(`${indent}${formattedKey}: ${cleanValue}`)
        }
      } else if (Array.isArray(value)) {
        sections.push(`${indent}${formattedKey}:`)
        value.forEach((item, index) => {
          if (typeof item === 'string') {
            sections.push(`${indent}${this.INDENT}${index + 1}. ${this.cleanText(item)}`)
          } else if (typeof item === 'object' && item !== null) {
            sections.push(`${indent}${this.INDENT}${index + 1}.`)
            sections.push(this.formatObject(item, level + 2))
          } else {
            sections.push(`${indent}${this.INDENT}${index + 1}. ${String(item)}`)
          }
        })
      } else if (typeof value === 'object') {
        sections.push(`${indent}${formattedKey}:`)
        sections.push(this.formatObject(value, level + 1))
      } else {
        sections.push(`${indent}${formattedKey}: ${value}`)
      }
    }
    
    return sections.join('\n')
  }

  private static formatKey(key: string): string {
    // Convert camelCase to Title Case
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()
  }

  private static cleanText(text: string): string {
    if (!text) return ''
    
    return text
      // Remove markdown formatting
      .replace(/#{1,6}\s+/g, '') // Headers
      .replace(/\*\*\*(.+?)\*\*\*/g, '$1') // Bold italic
      .replace(/\*\*(.+?)\*\*/g, '$1') // Bold
      .replace(/\*(.+?)\*/g, '$1') // Italic
      .replace(/__(.+?)__/g, '$1') // Bold (underscore)
      .replace(/_(.+?)_/g, '$1') // Italic (underscore)
      .replace(/~~(.+?)~~/g, '$1') // Strikethrough
      .replace(/`{3}[^`]*`{3}/g, '[Code block omitted]') // Code blocks
      .replace(/`([^`]+)`/g, '$1') // Inline code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Images
      .replace(/^\s*[-*+]\s+/gm, '• ') // Bullet points
      .replace(/^\s*\d+\.\s+/gm, (match, offset, str) => {
        const lineStart = str.lastIndexOf('\n', offset - 1) + 1
        const linePrefix = str.substring(lineStart, offset)
        return match
      }) // Keep numbered lists
      .replace(/^\s*>\s?/gm, '') // Blockquotes
      .replace(/\|/g, ' ') // Table separators
      .replace(/^[-=]{3,}$/gm, '') // Horizontal rules
      .trim()
  }
}