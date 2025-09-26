/**
 * Navigation Parser
 * Extracts and analyzes website navigation structure
 */

import { Page } from 'playwright'
import { permanentLogger } from '@/lib/utils/permanent-logger'

export interface NavigationItem {
  text: string
  href: string
  level: number
  type: 'main' | 'footer' | 'sidebar' | 'dropdown'
  children?: NavigationItem[]
}

export interface NavigationStructure {
  mainNav: NavigationItem[]
  footerNav: NavigationItem[]
  sidebarNav: NavigationItem[]
  breadcrumbs?: string[]
  totalLinks: number
  depth: number
}

export class NavigationParser {
  private page: Page

  constructor(page: Page) {
    this.page = page
  }

  async parseNavigation(): Promise<NavigationStructure> {
    permanentLogger.info('NAVIGATION_PARSER', 'Parsing navigation structure')

    const [mainNav, footerNav, sidebarNav, breadcrumbs] = await Promise.all([
      this.extractMainNavigation(),
      this.extractFooterNavigation(),
      this.extractSidebarNavigation(),
      this.extractBreadcrumbs()
    ])

    const structure: NavigationStructure = {
      mainNav,
      footerNav,
      sidebarNav,
      breadcrumbs,
      totalLinks: this.countTotalLinks(mainNav, footerNav, sidebarNav),
      depth: this.calculateMaxDepth(mainNav, footerNav, sidebarNav)
    }

    permanentLogger.info('NAVIGATION_PARSER', 'Navigation structure extracted', {
      mainNavItems: mainNav.length,
      footerNavItems: footerNav.length,
      sidebarNavItems: sidebarNav.length,
      hasBreadcrumbs: !!breadcrumbs?.length,
      totalLinks: structure.totalLinks,
      maxDepth: structure.depth
    })

    return structure
  }

  private async extractMainNavigation(): Promise<NavigationItem[]> {
    return await this.page.evaluate(() => {
      const items: NavigationItem[] = []
      
      // Common navigation selectors
      const navSelectors = [
        'nav:not(footer nav):not(aside nav)',
        'header nav',
        '[role="navigation"]:not(footer [role="navigation"])',
        '.navbar',
        '.nav-menu',
        '.main-nav',
        '#main-nav',
        '.site-nav'
      ]

      for (const selector of navSelectors) {
        const navElement = document.querySelector(selector)
        if (navElement) {
          const links = navElement.querySelectorAll('a')
          links.forEach(link => {
            const href = link.getAttribute('href') || ''
            const text = link.textContent?.trim() || ''
            
            if (text && href && !href.startsWith('#')) {
              // Check if this link has sub-navigation
              const parent = link.parentElement
              const subNav = parent?.querySelector('ul, .dropdown-menu, .submenu')
              const children: NavigationItem[] = []
              
              if (subNav) {
                subNav.querySelectorAll('a').forEach(subLink => {
                  const subHref = subLink.getAttribute('href') || ''
                  const subText = subLink.textContent?.trim() || ''
                  if (subText && subHref && !subHref.startsWith('#')) {
                    children.push({
                      text: subText,
                      href: subHref,
                      level: 2,
                      type: 'dropdown'
                    })
                  }
                })
              }
              
              // Avoid duplicates
              if (!items.some(item => item.href === href)) {
                items.push({
                  text,
                  href,
                  level: 1,
                  type: 'main',
                  ...(children.length > 0 && { children })
                })
              }
            }
          })
          
          if (items.length > 0) break // Found navigation, stop searching
        }
      }
      
      return items
    })
  }

  private async extractFooterNavigation(): Promise<NavigationItem[]> {
    return await this.page.evaluate(() => {
      const items: NavigationItem[] = []
      
      // Common footer selectors
      const footerSelectors = [
        'footer nav',
        'footer',
        '.footer',
        '#footer',
        '[role="contentinfo"]'
      ]

      for (const selector of footerSelectors) {
        const footerElement = document.querySelector(selector)
        if (footerElement) {
          const links = footerElement.querySelectorAll('a')
          links.forEach(link => {
            const href = link.getAttribute('href') || ''
            const text = link.textContent?.trim() || ''
            
            if (text && href && !href.startsWith('#')) {
              // Avoid duplicates
              if (!items.some(item => item.href === href)) {
                items.push({
                  text,
                  href,
                  level: 1,
                  type: 'footer'
                })
              }
            }
          })
          
          if (items.length > 0) break
        }
      }
      
      return items
    })
  }

  private async extractSidebarNavigation(): Promise<NavigationItem[]> {
    return await this.page.evaluate(() => {
      const items: NavigationItem[] = []
      
      // Common sidebar selectors
      const sidebarSelectors = [
        'aside nav',
        '.sidebar nav',
        '.sidenav',
        '.side-menu',
        '[role="complementary"] nav'
      ]

      for (const selector of sidebarSelectors) {
        const sidebarElement = document.querySelector(selector)
        if (sidebarElement) {
          const links = sidebarElement.querySelectorAll('a')
          links.forEach(link => {
            const href = link.getAttribute('href') || ''
            const text = link.textContent?.trim() || ''
            
            if (text && href && !href.startsWith('#')) {
              // Avoid duplicates
              if (!items.some(item => item.href === href)) {
                items.push({
                  text,
                  href,
                  level: 1,
                  type: 'sidebar'
                })
              }
            }
          })
          
          if (items.length > 0) break
        }
      }
      
      return items
    })
  }

  private async extractBreadcrumbs(): Promise<string[] | undefined> {
    return await this.page.evaluate(() => {
      // Common breadcrumb selectors
      const breadcrumbSelectors = [
        '[aria-label="breadcrumb"]',
        '.breadcrumb',
        '.breadcrumbs',
        'nav[role="navigation"][aria-label*="breadcrumb"]',
        '[itemtype="https://schema.org/BreadcrumbList"]'
      ]

      for (const selector of breadcrumbSelectors) {
        const breadcrumbElement = document.querySelector(selector)
        if (breadcrumbElement) {
          const items: string[] = []
          const links = breadcrumbElement.querySelectorAll('a, span:not(.separator)')
          
          links.forEach(item => {
            const text = item.textContent?.trim()
            if (text && !['›', '>', '/', '•', '|'].includes(text)) {
              items.push(text)
            }
          })
          
          if (items.length > 0) return items
        }
      }
      
      return undefined
    })
  }

  private countTotalLinks(...navArrays: NavigationItem[][]): number {
    let count = 0
    for (const navArray of navArrays) {
      for (const item of navArray) {
        count++
        if (item.children) {
          count += item.children.length
        }
      }
    }
    return count
  }

  private calculateMaxDepth(...navArrays: NavigationItem[][]): number {
    let maxDepth = 0
    
    const getDepth = (items: NavigationItem[], currentDepth: number = 1) => {
      maxDepth = Math.max(maxDepth, currentDepth)
      for (const item of items) {
        if (item.children) {
          getDepth(item.children, currentDepth + 1)
        }
      }
    }
    
    for (const navArray of navArrays) {
      if (navArray.length > 0) {
        getDepth(navArray)
      }
    }
    
    return maxDepth
  }

  /**
   * Get important pages from navigation (About, Products, Pricing, etc.)
   */
  getImportantPages(): string[] {
    const importantKeywords = [
      'about',
      'product',
      'service',
      'pricing',
      'team',
      'contact',
      'blog',
      'news',
      'career',
      'portfolio',
      'case study',
      'testimonial',
      'faq',
      'support',
      'documentation'
    ]

    return [] // This would be implemented to extract important page URLs
  }
}