// lib/company-intelligence/types/icon-enum.ts
/**
 * Icon Name Enum - CLAUDE.md Compliant
 * Single source of truth for all icon names used in the intelligence system
 * CRITICAL: All fixed lists must use enums per CLAUDE.md
 */

/**
 * Icon names for intelligence categories and UI elements
 * Maps to lucide-react icon components
 * @enum {string}
 */
export enum IconName {
  // Core Business Icons
  BUILDING = 'Building',
  BUILDING_2 = 'Building2',
  BRIEFCASE = 'Briefcase',
  
  // Product & Service Icons
  PACKAGE = 'Package',
  PACKAGE_2 = 'PackageSearch',
  BOX = 'Box',
  
  // Financial Icons  
  CREDIT_CARD = 'CreditCard',  // Using CreditCard instead of DollarSign per CLAUDE.md
  COINS = 'Coins',              // For credits, not dollars
  WALLET = 'Wallet',
  TRENDING_UP = 'TrendingUp',
  
  // Competition Icons
  SWORDS = 'Swords',
  TARGET = 'Target',
  CROSSHAIR = 'Crosshair',
  
  // Team Icons
  USERS = 'Users',
  USER_CHECK = 'UserCheck',
  USER_PLUS = 'UserPlus',
  
  // Document Icons
  FILE_CHECK = 'FileCheck',
  FILE_TEXT = 'FileText',
  FILE_SEARCH = 'FileSearch',
  FOLDER_OPEN = 'FolderOpen',
  
  // Technical Icons
  BRAIN = 'Brain',
  CPU = 'Cpu',
  CODE = 'Code',
  SERVER = 'Server',
  SETTINGS = 'Settings',
  
  // Security Icons
  SHIELD = 'Shield',
  SHIELD_CHECK = 'ShieldCheck',
  LOCK = 'Lock',
  KEY = 'Key',
  
  // Analytics Icons
  BAR_CHART = 'BarChart3',
  PIE_CHART = 'PieChart',
  LINE_CHART = 'LineChart',
  ACTIVITY = 'Activity',
  
  // Content Icons
  BOOK_OPEN = 'BookOpen',
  NEWSPAPER = 'Newspaper',
  PEN_TOOL = 'PenTool',
  MESSAGE_SQUARE = 'MessageSquare',
  
  // Social Proof Icons
  STAR = 'Star',
  AWARD = 'Award',
  TROPHY = 'Trophy',
  THUMBS_UP = 'ThumbsUp',
  
  // Event Icons
  CALENDAR = 'Calendar',
  CALENDAR_DAYS = 'CalendarDays',
  CLOCK = 'Clock',
  
  // Integration Icons
  PLUG = 'Plug',
  LINK = 'Link',
  SHARE_2 = 'Share2',
  
  // Support Icons
  HELP_CIRCLE = 'HelpCircle',
  HEADPHONES = 'Headphones',
  MESSAGE_CIRCLE = 'MessageCircle',
  
  // Career Icons
  GRADUATION_CAP = 'GraduationCap',
  BRIEFCASE_2 = 'Briefcase',
  
  // General Icons
  LAYERS = 'Layers',
  SPARKLES = 'Sparkles',
  INFO = 'Info',
  ALERT_CIRCLE = 'AlertCircle',
  CHECK_CIRCLE = 'CheckCircle2',
  X_CIRCLE = 'XCircle'
}

/**
 * Map intelligence categories to their icons
 * Ensures consistent icon usage across the application
 */
export const CATEGORY_ICONS: Record<string, IconName> = {
  corporate: IconName.BUILDING,
  products: IconName.PACKAGE,
  pricing: IconName.CREDIT_CARD,  // Credit icon, not dollar per CLAUDE.md
  competitors: IconName.SWORDS,
  team: IconName.USERS,
  case_studies: IconName.FILE_CHECK,
  technical: IconName.BRAIN,
  compliance: IconName.SHIELD,
  blog: IconName.BOOK_OPEN,
  testimonials: IconName.STAR,
  partnerships: IconName.SHARE_2,
  resources: IconName.FOLDER_OPEN,
  events: IconName.CALENDAR,
  features: IconName.PACKAGE_2,
  integrations: IconName.PLUG,
  support: IconName.HELP_CIRCLE,
  careers: IconName.BRIEFCASE,
  investors: IconName.TRENDING_UP,
  press: IconName.NEWSPAPER,
  market_position: IconName.BAR_CHART,
  content: IconName.PEN_TOOL,
  social_proof: IconName.AWARD,
  commercial: IconName.COINS,
  customer_experience: IconName.USERS,
  financial: IconName.TRENDING_UP
}

/**
 * Validation helper
 * @param {string} value - The icon name to validate
 * @returns {boolean} True if valid icon name
 */
export const isValidIconName = (value: string): value is IconName => {
  return Object.values(IconName).includes(value as IconName)
}

/**
 * Get icon component from lucide-react
 * This is a type-safe mapping function
 */
export function getIconComponent(iconName: IconName): string {
  // Return the lucide-react component name
  // The actual component import happens in the UI layer
  return iconName
}

// Type-safe icon name type
export type IconNameValue = `${IconName}`

// Export for use in other files
export const ICON_NAMES = Object.values(IconName) as readonly string[]
