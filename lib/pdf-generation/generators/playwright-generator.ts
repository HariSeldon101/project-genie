/**
 * Playwright PDF Generator
 * Converts HTML to PDF using Playwright (replacing Puppeteer)
 */

import { chromium, Browser, Page } from 'playwright'
import { PDFOptions as PlaywrightPDFOptions } from 'playwright'
import { PDFOptions, GeneratedPDF, PDFMetadata } from '../types'
import fs from 'fs/promises'
import path from 'path'

// Direct Playwright usage - no need for complex browser pool
// V4 simplification: just use Playwright directly

export class PlaywrightPDFGenerator {
  private cssPath: string
  private browser: Browser | null = null

  constructor() {
    this.cssPath = path.join(process.cwd(), 'lib', 'pdf-generation', 'styles', 'pdf-styles.css')
  }

  /**
   * Generate PDF from HTML string
   */
  async generatePDF(html: string, options: PDFOptions = {}): Promise<Buffer> {
    let page: Page | null = null

    try {
      // Launch browser directly - simpler than pool
      if (!this.browser) {
        this.browser = await chromium.launch({
          headless: true
        })
      }

      const context = await this.browser.newContext({
        viewport: {
          width: 1200,
          height: 1600
        },
        deviceScaleFactor: 2
      })

      page = await context.newPage()

      // Process HTML to enhance TOC links for PDF
      html = this.enhanceHTMLForPDF(html)

      // Load CSS if needed
      let fullHtml = html
      if (!html.includes('<style>')) {
        try {
          const css = await fs.readFile(this.cssPath, 'utf-8')
          fullHtml = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <style>${css}</style>
                ${this.getPDFEnhancementStyles()}
                ${this.getMermaidScripts()}
              </head>
              <body>
                ${html}
              </body>
            </html>
          `
        } catch (error) {
          // CSS file not found, use inline styles from HTML
          fullHtml = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                ${this.getPDFEnhancementStyles()}
                ${this.getMermaidScripts()}
              </head>
              <body>
                ${html}
              </body>
            </html>
          `
        }
      } else {
        // HTML already contains styles
        fullHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              ${this.getPDFEnhancementStyles()}
              ${this.getMermaidScripts()}
            </head>
            <body>
              ${html}
            </body>
          </html>
        `
      }

      // Set content with increased timeout
      await page.setContent(fullHtml, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      })

      // Wait for fonts to load
      try {
        await page.evaluate(() => document.fonts.ready)
      } catch (e) {
        console.log('Font loading skipped:', e.message)
      }

      // Wait for Mermaid charts to render if present
      await page.evaluate(() => {
        return new Promise<void>((resolve) => {
          const mermaidElements = document.querySelectorAll('.mermaid')
          if (mermaidElements.length > 0 && (window as any).mermaid) {
            // Give Mermaid time to render
            setTimeout(() => resolve(), 1000)
          } else {
            resolve()
          }
        })
      })

      // Configure PDF options (Playwright API is very similar to Puppeteer)
      const pdfOptions: PlaywrightPDFOptions = {
        format: options.format || 'A4',
        printBackground: true,
        preferCSSPageSize: false,
        margin: options.margin || {
          top: '20mm',
          right: '12mm',
          bottom: '20mm',
          left: '12mm'
        },
        displayHeaderFooter: options.pageNumbers || options.headerText || options.footerText ? true : false,
        tagged: true,
        outline: true
      }

      // Add header and footer if needed
      if (pdfOptions.displayHeaderFooter) {
        pdfOptions.headerTemplate = this.createHeaderTemplate(options)
        pdfOptions.footerTemplate = this.createFooterTemplate(options)

        // Increase margins to prevent header/footer overlap
        pdfOptions.margin = {
          top: '45mm',
          right: '12mm',
          bottom: '40mm',
          left: '12mm'
        }
      }

      // Generate PDF
      const pdfBuffer = await page.pdf(pdfOptions)

      return pdfBuffer

    } finally {
      // Close page and context (browser pool handles browser lifecycle)
      if (page) {
        await page.close()
        const context = page.context()
        await context.close()
      }
    }
  }

  /**
   * Enhance HTML for better PDF rendering
   */
  private enhanceHTMLForPDF(html: string): string {
    // Add IDs to headings if they don't have them
    let idCounter = 0
    html = html.replace(/<(h[1-6])([^>]*)>([^<]+)<\/\1>/gi, (match, tag, attrs, content) => {
      if (!attrs.includes('id=')) {
        const id = `heading-${++idCounter}`
        return `<${tag}${attrs} id="${id}">${content}</${tag}>`
      }
      return match
    })

    // Ensure TOC links work properly
    html = html.replace(/href="#([^"]+)"/g, (match, id) => {
      return `href="#${id}" onclick="return true;"`
    })

    return html
  }

  /**
   * Get Mermaid scripts for rendering charts
   */
  private getMermaidScripts(): string {
    return `
      <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
      <script>
        document.addEventListener('DOMContentLoaded', function() {
          mermaid.initialize({
            startOnLoad: true,
            theme: 'default',
            themeVariables: {
              fontFamily: 'Arial, sans-serif',
              fontSize: '12px',
              primaryColor: '#667eea',
              primaryTextColor: '#fff',
              primaryBorderColor: '#5a67d8',
              lineColor: '#5a67d8',
              secondaryColor: '#f7fafc',
              tertiaryColor: '#e2e8f0',
              cScale0: '#667eea',
              cScale1: '#fde047',
              cScale2: '#86efac',
              cScale3: '#c084fc'
            },
            timeline: {
              padding: 10,
              boxMargin: 5,
              boxTextMargin: 3,
              noteMargin: 5,
              messageMargin: 20,
              messageAlign: 'center',
              bottomMarginAdj: 1,
              useMaxWidth: true,
              rightAngles: false,
              fontSize: 7,
              sectionFontSize: 8
            },
            gantt: {
              fontSize: 9,
              gridLineStartPadding: 150,
              numberSectionStyles: 2,
              leftPadding: 80,
              sectionFontSize: 10,
              barHeight: 18,
              barGap: 2,
              topPadding: 30,
              rightPadding: 50
            },
            flowchart: {
              nodeSpacing: 50,
              rankSpacing: 50,
              htmlLabels: true,
              curve: 'basis'
            }
          });
          mermaid.contentLoaded();
        });
      </script>
    `
  }

  /**
   * Get PDF enhancement styles
   */
  private getPDFEnhancementStyles(): string {
    return `
      <style>
        /* PDF-specific styles */
        @media print {
          /* Ensure links are visible in PDF */
          a {
            text-decoration: none;
            color: #0066cc;
          }

          /* Page break control */
          h1 {
            page-break-before: always;
            page-break-after: avoid;
          }

          h2, h3 {
            page-break-after: avoid;
          }

          /* Keep tables together */
          table {
            page-break-inside: avoid;
          }

          /* Keep list items together */
          li {
            page-break-inside: avoid;
          }

          /* TOC styling */
          .toc {
            page-break-after: always;
          }

          .toc a {
            text-decoration: none;
            color: #333;
            display: block;
            padding: 4px 0;
            border-bottom: 1px dotted #ccc;
          }

          .toc a:hover {
            background-color: #f0f0f0;
          }

          /* Charts and diagrams */
          .chart-container, .diagram-container {
            page-break-inside: avoid;
            margin: 20px 0;
          }

          /* Force all Mermaid charts to use full width in PDF */
          .mermaid-chart {
            margin-left: -15mm !important;
            margin-right: -15mm !important;
            width: calc(100% + 30mm) !important;
            padding: 10px 5px !important;
          }

          /* Smaller text for all chart types */
          .mermaid text {
            font-size: 7pt !important;
          }

          .mermaid .nodeLabel,
          .mermaid .taskText,
          .mermaid .timeline-text {
            font-size: 6pt !important;
          }
        }
      </style>
    `
  }

  /**
   * Generate PDF with metadata
   */
  async generatePDFWithMetadata(
    html: string,
    metadata: PDFMetadata,
    options: PDFOptions = {}
  ): Promise<GeneratedPDF> {
    const buffer = await this.generatePDF(html, options)

    return {
      buffer,
      metadata,
      pageCount: await this.getPageCount(buffer),
      size: buffer.length
    }
  }

  /**
   * Create header template
   */
  private createHeaderTemplate(options: PDFOptions): string {
    if (!options.headerText && !options.pageNumbers) return '<div></div>'

    return `
      <div style="
        width: 100%;
        padding: 8px 20px;
        font-size: 9px;
        color: #999;
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 5px;
      ">
        <span style="font-size: 8px;">${options.headerText || ''}</span>
        <span style="text-align: right; font-size: 8px;">
          <span class="date"></span>
        </span>
      </div>
    `
  }

  /**
   * Create footer template
   */
  private createFooterTemplate(options: PDFOptions): string {
    const hasFooterText = !!options.footerText
    const hasProjectGenie = !options.whiteLabel
    const hasPageNumbers = options.pageNumbers !== false

    if (!hasFooterText && !hasProjectGenie && !hasPageNumbers) return '<div></div>'

    return `
      <div style="
        width: 100%;
        padding: 8px 20px;
        font-size: 9px;
        color: #666;
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 5px;
      ">
        <span>${hasProjectGenie ? 'Generated by Project Genie' : ''}</span>
        <span style="text-align: center;">${hasFooterText ? options.footerText : ''}</span>
        <span style="text-align: right;">
          ${hasPageNumbers ? 'Page <span class="pageNumber"></span> of <span class="totalPages"></span>' : ''}
        </span>
      </div>
    `
  }

  /**
   * Get page count from PDF buffer
   */
  private async getPageCount(buffer: Buffer): Promise<number> {
    // Simple PDF page count detection
    const content = buffer.toString('latin1')
    const matches = content.match(/\/Type\s*\/Page[^s]/g)
    return matches ? matches.length : 1
  }

  /**
   * Generate thumbnail from PDF
   */
  async generateThumbnail(pdfBuffer: Buffer, pageNumber: number = 1): Promise<Buffer> {
    let page: Page | null = null

    try {
      const browser = await this.browserPool.getBrowser()
      const context = await browser.newContext()
      page = await context.newPage()

      // Convert PDF to base64 data URL
      const base64 = pdfBuffer.toString('base64')
      const dataUrl = `data:application/pdf;base64,${base64}`

      // Create HTML with embedded PDF
      const html = `
        <!DOCTYPE html>
        <html>
          <body style="margin: 0; padding: 0;">
            <canvas id="pdfCanvas"></canvas>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
            <script>
              pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

              async function renderPDF() {
                const pdf = await pdfjsLib.getDocument('${dataUrl}').promise;
                const page = await pdf.getPage(${pageNumber});
                const viewport = page.getViewport({ scale: 1 });

                const canvas = document.getElementById('pdfCanvas');
                const context = canvas.getContext('2d');
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                await page.render({
                  canvasContext: context,
                  viewport: viewport
                }).promise;
              }

              renderPDF();
            </script>
          </body>
        </html>
      `

      await page.setContent(html, { waitUntil: 'networkidle' })
      await page.waitForSelector('#pdfCanvas')
      await page.waitForTimeout(1000)

      // Take screenshot of the canvas
      const canvas = await page.$('#pdfCanvas')
      const screenshot = await canvas!.screenshot({
        type: 'png',
        omitBackground: false
      })

      return screenshot as Buffer

    } finally {
      if (page) {
        const context = page.context()
        await page.close()
        await context.close()
      }
    }
  }

  /**
   * Cleanup browser instance
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }
}

/**
 * Factory function for creating PDF generator
 */
export function createPDFGenerator(): PlaywrightPDFGenerator {
  return new PlaywrightPDFGenerator()
}