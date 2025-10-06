// Type definitions for the Scraping Dashboard components

export interface ScrapedDataCategory {
  id: string
  title: string
  icon: string
  count: number
  items: DataItem[]
  expanded: boolean
}

export interface DataItem {
  id: string
  categoryId: string
  type: string
  source: 'firecrawl' | 'playwright' | 'cheerio'
  content: any
  preview: string
  selected: boolean
  quality: number  // 0-100 quality score
  tokens: number   // Estimated token count
  cost: number     // Estimated enrichment cost
  timestamp: number // When scraped
  validated?: boolean // Has been validated
  metadata?: {
    url?: string
    selector?: string
    method?: string
    confidence?: number
  }
}

export interface SelectedData {
  items: DataItem[]
  totalTokens: number
  estimatedCost: number
}

export interface SelectionState {
  categories: Map<string, CategoryState>
  selectedItems: Set<string>
  totalTokens: number
  estimatedCost: number
  enrichmentReady: boolean
}

export interface CategoryState {
  id: string
  title: string
  items: DataItem[]
  expanded: boolean
  selectedCount: number
}

// Animation variants for Framer Motion
export const animationVariants = {
  categoryAnimation: {
    open: {
      opacity: 1,
      height: "auto",
      transition: {
        duration: 0.3,
        ease: "easeOut",
        staggerChildren: 0.05
      }
    },
    collapsed: {
      opacity: 0,
      height: 0,
      transition: {
        duration: 0.2,
        ease: "easeIn"
      }
    }
  },

  itemSelection: {
    selected: {
      scale: 1.01,
      backgroundColor: "rgba(34, 197, 94, 0.05)",
      transition: { duration: 0.2 }
    },
    unselected: {
      scale: 1,
      backgroundColor: "transparent",
      transition: { duration: 0.2 }
    }
  },

  staggerContainer: {
    animate: {
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    }
  },

  listItem: {
    initial: {
      opacity: 0,
      x: -20
    },
    animate: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    },
    exit: {
      opacity: 0,
      x: 20,
      transition: {
        duration: 0.2
      }
    }
  },

  fadeIn: {
    initial: {
      opacity: 0,
      y: 10
    },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3
      }
    },
    exit: {
      opacity: 0,
      y: -10,
      transition: {
        duration: 0.2
      }
    }
  }
}