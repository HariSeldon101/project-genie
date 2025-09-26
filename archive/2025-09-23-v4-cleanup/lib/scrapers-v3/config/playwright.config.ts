/**
 * Playwright Configuration with Enterprise Anti-Detection
 *
 * NATIVE FEATURES LEVERAGED:
 * - Automatic cookie and session management (replaces cookie-manager.ts - 200 lines)
 * - Built-in request interception and modification
 * - Native screenshot and PDF generation
 * - Browser context isolation for security
 * - Automatic retry and error recovery
 * - WebSocket and SSE support for real-time data
 *
 * ANTI-DETECTION MEASURES:
 * - playwright-extra-plugin-stealth: Hides automation signals
 * - Fingerprint randomization: Unique browser identity each session
 * - Human behavior simulation: Natural interaction patterns
 * - Proxy rotation: Different IP per request
 * - Session persistence: Appear as returning user
 * - Resource blocking: Reduce tracking fingerprint
 *
 * PRIVACY FEATURES:
 * - WebRTC leak prevention
 * - Canvas fingerprinting protection
 * - WebGL metadata randomization
 * - Font fingerprinting mitigation
 * - Hardware fingerprint spoofing
 */

/**
 * Complete Playwright configuration interface
 * Covers all anti-detection and privacy features
 */
export interface PlaywrightConfig {
  /**
   * Core browser automation features
   * Standard Playwright capabilities
   */
  features: {
    /**
     * Capture page screenshots
     * Full page or viewport only
     */
    screenshots: boolean

    /**
     * Generate PDF documents
     * With headers, footers, and styling
     */
    pdf: boolean

    /**
     * Record video of sessions
     * For debugging and analysis
     */
    video: boolean

    /**
     * Enable trace recording
     * Detailed debugging information
     */
    tracing: boolean

    /**
     * Intercept network requests
     * Monitor and modify traffic
     */
    networkIntercept: boolean

    /**
     * Capture console output
     * JavaScript logs and errors
     */
    console: boolean

    /**
     * Save HAR files
     * Network activity archives
     */
    har: boolean

    /**
     * Coverage tracking
     * Code coverage analysis
     */
    coverage: boolean
  }

  /**
   * Complete anti-detection suite
   * All privacy and stealth features
   */
  stealth: {
    /**
     * Enable anti-detection features
     * Master switch for stealth mode
     */
    enabled: boolean


    /**
     * Browser fingerprint management
     * Create unique browser identity
     */
    fingerprint: {
      /**
       * Randomize viewport dimensions
       * Vary window size
       */
      randomizeViewport: boolean

      /**
       * Viewport size range
       * Min and max dimensions
       */
      viewportRange?: {
        width: [number, number]  // [min, max]
        height: [number, number] // [min, max]
      }

      /**
       * Randomize user agent string
       * Different browser identity
       */
      randomizeUserAgent: boolean

      /**
       * Custom user agent list
       * Specific user agents to rotate through
       */
      userAgentList?: string[]

      /**
       * Hide webdriver property
       * Remove navigator.webdriver flag
       */
      hideWebdriver?: boolean

      /**
       * Canvas fingerprinting protection
       * Add noise to canvas operations
       */
      randomizeCanvas: boolean

      /**
       * WebGL fingerprinting protection
       * Randomize GPU information
       */
      randomizeWebGL: boolean

      /**
       * Audio fingerprinting protection
       * Modify audio context
       */
      randomizeAudio: boolean

      /**
       * Font fingerprinting protection
       * Hide installed fonts
       */
      randomizeFonts: boolean


      /**
       * Platform spoofing
       * OS platform string
       */
      platform?: string

      /**
       * Hardware concurrency
       * Number of CPU cores
       */
      hardwareConcurrency?: number

      /**
       * Device memory (GB)
       * RAM amount to report
       */
      deviceMemory?: number

      /**
       * Screen resolution
       * Display dimensions
       */
      screenResolution?: {
        width: number
        height: number
        colorDepth: number
      }

      /**
       * Touch support
       * Enable touch events
       */
      hasTouch?: boolean

      /**
       * WebRTC IP handling
       * Prevent IP leaks
       */
      webRTCPolicy?: 'disable' | 'default' | 'default_public_interface_only' | 'default_public_and_private_interfaces'
    }

    /**
     * Session management
     * Cookie and storage persistence
     */
    session: {
      /**
       * Persist cookies between sessions
       * Appear as returning visitor
       */
      persistCookies: boolean

      /**
       * Cookie storage file path
       * Where to save/load cookies
       */
      cookiePath?: string

      /**
       * Persist localStorage
       * Save site preferences
       */
      persistLocalStorage: boolean

      /**
       * Persist sessionStorage
       * Maintain session data
       */
      persistSessionStorage: boolean

      /**
       * Create new session per scrape
       * Fresh identity each time
       */
      rotateSession: boolean

      /**
       * Session lifetime in ms
       * When to refresh session
       */
      sessionLifetime?: number

      /**
       * Session pool size
       * Number of sessions to maintain
       */
      sessionPoolSize?: number

      /**
       * Timezone for the session
       * Match to proxy location
       */
      timezone?: string

      /**
       * Locale for the session
       * Browser language setting
       */
      locale?: string

      /**
       * Geolocation coordinates
       * GPS location to report
       */
      geolocation?: {
        latitude: number
        longitude: number
      }

      /**
       * Rotate user agent per session
       * Change browser identity
       */
      rotateUserAgent?: boolean

      /**
       * Clear cookies on start
       * Fresh session
       */
      clearCookies?: boolean

      /**
       * Clear cache on start
       * No cached resources
       */
      clearCache?: boolean
    }

    /**
     * Human behavior simulation
     * Natural interaction patterns
     */
    behavior: {
      /**
       * Natural mouse movements
       * Curved paths, not straight lines
       */
      humanizeMouseMovement: boolean

      /**
       * Mouse movement speed
       * How fast to move cursor
       */
      mouseSpeed?: 'slow' | 'medium' | 'fast' | 'variable'

      /**
       * Random delays between actions
       * Not instant interactions
       */
      randomizeDelays: boolean

      /**
       * Delay range in milliseconds
       * Min and max wait times
       */
      delayRange: [number, number]

      /**
       * Page scrolling pattern
       * How to scroll pages
       */
      scrollPattern: 'none' | 'linear' | 'smooth' | 'human' | 'random'

      /**
       * Scroll speed (pixels/second)
       * How fast to scroll
       */
      scrollSpeed?: number

      /**
       * Randomize click positions
       * Don't always click center
       */
      randomizeClickPositions: boolean

      /**
       * Click offset range (pixels)
       * How much to vary click position
       */
      clickOffset?: number

      /**
       * Simulate keyboard tabbing
       * Tab through forms naturally
       */
      simulateTabbing: boolean

      /**
       * Simulate reading behavior
       * Pause as if reading content
       */
      simulateReading: boolean

      /**
       * Reading speed (words/minute)
       * How fast user "reads"
       */
      readingSpeed?: number

      /**
       * Natural exit patterns
       * Don't just close instantly
       */
      exitPatterns: boolean

      /**
       * Mouse jitter
       * Small random movements
       */
      mouseJitter?: boolean

      /**
       * Typing speed (chars/second)
       * Natural typing rhythm
       */
      typingSpeed?: number

      /**
       * Typo probability
       * Make and correct typos
       */
      typoRate?: number
    }

    /**
     * Proxy and network configuration
     * IP rotation and geo-location
     */
    proxy: {
      /**
       * Enable proxy usage
       * Route through proxy server
       */
      enabled: boolean

      /**
       * Proxy type
       * Quality and anonymity level
       */
      type: 'datacenter' | 'residential' | 'mobile' | 'rotating'

      /**
       * Proxy server URL
       * Full proxy address
       */
      server?: string

      /**
       * Proxy authentication username
       */
      username?: string

      /**
       * Proxy authentication password
       */
      password?: string

      /**
       * Rotate proxy per request
       * New IP each request
       */
      rotatePerRequest: boolean

      /**
       * Target country code
       * Geo-location preference
       */
      country?: string

      /**
       * Target city
       * More specific location
       */
      city?: string

      /**
       * Use sticky sessions
       * Keep same IP for duration
       */
      sticky?: boolean

      /**
       * Sticky session duration (ms)
       * How long to keep same IP
       */
      stickyTime?: number

      /**
       * Proxy pool size
       * Number of proxies to rotate
       */
      poolSize?: number

      /**
       * Bypass for local addresses
       * Don't proxy local traffic
       */
      bypass?: string[]
    }

    /**
     * Advanced evasion techniques
     * Deep anti-detection measures
     */
    evasion: {
      /**
       * Hide webdriver property
       * Remove automation flag
       */
      webdriver: boolean

      /**
       * Mask navigator properties
       * Hide browser details
       */
      navigator: boolean

      /**
       * Fake permissions API
       * Pretend permissions granted
       */
      permissions: boolean

      /**
       * Disable WebRTC
       * Prevent IP leakage
       */
      webrtc: boolean

      /**
       * Match timezone to IP
       * Consistent location
       */
      timezoneConsistency: boolean

      /**
       * Audio context fingerprinting
       * Randomize audio properties
       */
      audioContext: boolean

      /**
       * Client rects noise
       * Vary element dimensions
       */
      clientRects: boolean

      /**
       * Battery API spoofing
       * Fake battery status
       */
      battery: boolean

      /**
       * Hardware acceleration
       * GPU fingerprint protection
       */
      hardwareAcceleration: boolean

      /**
       * Speech synthesis spoofing
       * Hide voice list
       */
      speechSynthesis: boolean

      /**
       * Bluetooth API hiding
       * No bluetooth access
       */
      bluetooth: boolean

      /**
       * USB API hiding
       * No USB device access
       */
      usb: boolean

      /**
       * MIDI API hiding
       * No MIDI device access
       */
      midi: boolean
    }
  }

  /**
   * Browser launch configuration
   * Core Playwright settings
   */
  browser: {
    /**
     * Browser engine to use
     * Chromium, Firefox, or WebKit
     */
    type: 'chromium' | 'firefox' | 'webkit'

    /**
     * Browser channel
     * Specific browser version
     */
    channel?: 'chrome' | 'chrome-beta' | 'chrome-dev' | 'chrome-canary' | 'msedge' | 'msedge-beta' | 'msedge-dev'

    /**
     * Headless mode
     * Run without UI
     */
    headless: boolean | 'new'

    /**
     * Open DevTools panel
     * For debugging
     */
    devtools: boolean

    /**
     * Slow down operations (ms)
     * Make actions visible
     */
    slowMo?: number

    /**
     * Browser launch arguments
     * Command-line flags
     */
    args?: string[]

    /**
     * Custom browser executable
     * Use specific browser binary
     */
    executablePath?: string

    /**
     * Ignore default args
     * Full control over launch
     */
    ignoreDefaultArgs?: boolean | string[]

    /**
     * Handle SIGINT
     * Graceful shutdown
     */
    handleSIGINT?: boolean

    /**
     * Handle SIGTERM
     * Graceful shutdown
     */
    handleSIGTERM?: boolean

    /**
     * Handle SIGHUP
     * Graceful shutdown
     */
    handleSIGHUP?: boolean

    /**
     * Dumpio
     * Pipe browser logs
     */
    dumpio?: boolean

    /**
     * Environment variables
     * Pass to browser process
     */
    env?: Record<string, string>
  }

  /**
   * Resource management
   * Control what gets loaded
   */
  resources: {
    /**
     * Block image loading
     * Faster, less fingerprinting
     */
    blockImages: boolean

    /**
     * Block stylesheets
     * Reduce complexity
     */
    blockStylesheets: boolean

    /**
     * Block font loading
     * Hide font fingerprint
     */
    blockFonts: boolean

    /**
     * Block media files
     * Video and audio
     */
    blockMedia: boolean

    /**
     * Block specific scripts
     * By URL pattern
     */
    blockScripts?: string[]

    /**
     * Allow only these domains
     * Whitelist approach
     */
    allowedDomains?: string[]

    /**
     * Block these domains
     * Blacklist approach
     */
    blockedDomains?: string[]

    /**
     * Enable browser cache
     * Faster repeat visits
     */
    cacheEnabled: boolean

    /**
     * Block WebSockets
     * Prevent real-time tracking
     */
    blockWebSockets?: boolean

    /**
     * Block EventSource
     * Prevent SSE tracking
     */
    blockEventSource?: boolean

    /**
     * Custom resource types to block
     * Fine-grained control
     */
    blockTypes?: Array<'document' | 'stylesheet' | 'image' | 'media' | 'font' | 'script' | 'texttrack' | 'xhr' | 'fetch' | 'eventsource' | 'websocket' | 'manifest' | 'other'>
  }

  /**
   * Performance and limit configuration
   * Resource constraints
   */
  limits: {
    /**
     * Maximum pages to scrape
     * Hard limit
     */
    maxPages: number

    /**
     * Maximum parallel pages
     * Concurrency limit
     */
    maxConcurrency: number

    /**
     * Page load timeout (ms)
     * When to give up
     */
    pageTimeout: number

    /**
     * Action timeout (ms)
     * Click, type, etc.
     */
    actionTimeout: number

    /**
     * Navigation timeout (ms)
     * Page transitions
     */
    navigationTimeout: number

    /**
     * Maximum retries
     * For failed operations
     */
    maxRetries: number

    /**
     * Retry delay (ms)
     * Wait between retries
     */
    retryDelay: number

    /**
     * Maximum redirects
     * Follow limit
     */
    maxRedirects?: number

    /**
     * Memory limit (MB)
     * Browser memory cap
     */
    memoryLimit?: number

    /**
     * CPU limit (%)
     * Processor usage cap
     */
    cpuLimit?: number
  }
}

/**
 * Preset configurations for different scenarios
 * Ready-to-use anti-detection setups
 */
export const PLAYWRIGHT_PRESETS: Record<string, PlaywrightConfig> = {
  /**
   * Maximum stealth configuration
   * All anti-detection features enabled
   */
  maximum_stealth: {
    features: {
      screenshots: false, // Minimize footprint
      pdf: false,
      video: false,
      tracing: false,
      networkIntercept: true,
      console: false,
      har: false,
      coverage: false
    },
    stealth: {
      enabled: true,
      fingerprint: {
        randomizeViewport: true,
        viewportRange: {
          width: [1280, 1920],
          height: [720, 1080]
        },
        randomizeUserAgent: true,
        userAgentList: [
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ],
        hideWebdriver: true,
        randomizeCanvas: true,
        randomizeWebGL: true,
        randomizeAudio: true,
        randomizeFonts: true,
        hardwareConcurrency: 4,
        deviceMemory: 8,
        webRTCPolicy: 'disable'
      },
      session: {
        persistCookies: true,
        cookiePath: './sessions/cookies.json',
        persistLocalStorage: true,
        persistSessionStorage: true,
        rotateSession: false,
        sessionLifetime: 3600000, // 1 hour
        timezone: 'America/New_York',
        locale: 'en-US'
      },
      behavior: {
        humanizeMouseMovement: true,
        mouseSpeed: 'variable',
        randomizeDelays: true,
        delayRange: [2000, 5000],
        scrollPattern: 'human',
        scrollSpeed: 300,
        randomizeClickPositions: true,
        clickOffset: 5,
        simulateTabbing: true,
        simulateReading: true,
        readingSpeed: 250,
        exitPatterns: true,
        mouseJitter: true,
        typingSpeed: 5,
        typoRate: 0.02
      },
      proxy: {
        enabled: true,
        type: 'residential',
        rotatePerRequest: false,
        country: 'US',
        sticky: true,
        stickyTime: 600000 // 10 minutes
      },
      evasion: {
        webdriver: true,
        navigator: true,
        permissions: true,
        webrtc: true,
        timezoneConsistency: true,
        audioContext: true,
        clientRects: true,
        battery: true,
        hardwareAcceleration: true,
        speechSynthesis: true,
        bluetooth: true,
        usb: true,
        midi: true
      }
    },
    browser: {
      type: 'chromium',
      channel: 'chrome',
      headless: false, // Real browser window
      devtools: false,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-site-isolation-trials',
        '--disable-web-security',
        '--disable-features=BlockInsecurePrivateNetworkRequests',
        '--disable-features=ImprovedCookieControls',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    },
    resources: {
      blockImages: false, // Load everything
      blockStylesheets: false,
      blockFonts: false,
      blockMedia: false,
      cacheEnabled: true,
      blockedDomains: [
        'google-analytics.com',
        'googletagmanager.com',
        'doubleclick.net',
        'facebook.com',
        'twitter.com'
      ]
    },
    limits: {
      maxPages: 50,
      maxConcurrency: 1, // Single page at a time
      pageTimeout: 90000,
      actionTimeout: 30000,
      navigationTimeout: 90000,
      maxRetries: 5,
      retryDelay: 5000
    }
  },

  /**
   * Balanced configuration
   * Good protection with reasonable performance
   */
  balanced: {
    features: {
      screenshots: true,
      pdf: false,
      video: false,
      tracing: false,
      networkIntercept: false,
      console: true,
      har: false,
      coverage: false
    },
    stealth: {
      enabled: true,
      fingerprint: {
        randomizeViewport: true,
        viewportRange: {
          width: [1366, 1920],
          height: [768, 1080]
        },
        randomizeUserAgent: true,
        hideWebdriver: true,
        randomizeCanvas: false,
        randomizeWebGL: false,
        randomizeAudio: false,
        randomizeFonts: false
      },
      session: {
        persistCookies: true,
        rotateSession: false
      },
      behavior: {
        humanizeMouseMovement: false,
        randomizeDelays: true,
        delayRange: [1000, 3000],
        scrollPattern: 'smooth',
        randomizeClickPositions: false,
        simulateTabbing: false,
        simulateReading: false,
        exitPatterns: false
      },
      proxy: {
        enabled: false
      },
      evasion: {
        webdriver: true,
        navigator: true,
        permissions: false,
        webrtc: false,
        timezoneConsistency: false,
        audioContext: false,
        clientRects: false,
        battery: false,
        hardwareAcceleration: false,
        speechSynthesis: false,
        bluetooth: false,
        usb: false,
        midi: false
      }
    },
    browser: {
      type: 'chromium',
      headless: true,
      devtools: false
    },
    resources: {
      blockImages: false,
      blockStylesheets: false,
      blockFonts: true,
      blockMedia: true,
      cacheEnabled: true
    },
    limits: {
      maxPages: 100,
      maxConcurrency: 3,
      pageTimeout: 30000,
      actionTimeout: 10000,
      navigationTimeout: 30000,
      maxRetries: 3,
      retryDelay: 2000
    }
  },

  /**
   * Fast configuration
   * Minimal protection for speed
   */
  fast: {
    features: {
      screenshots: false,
      pdf: false,
      video: false,
      tracing: false,
      networkIntercept: false,
      console: false,
      har: false,
      coverage: false
    },
    stealth: {
      enabled: false,
      fingerprint: {
        randomizeViewport: false,
        randomizeUserAgent: false,
        randomizeCanvas: false,
        randomizeWebGL: false,
        randomizeAudio: false,
        randomizeFonts: false
      },
      session: {
        persistCookies: false,
        rotateSession: true
      },
      behavior: {
        humanizeMouseMovement: false,
        randomizeDelays: false,
        delayRange: [0, 0],
        scrollPattern: 'none',
        randomizeClickPositions: false,
        simulateTabbing: false,
        simulateReading: false,
        exitPatterns: false
      },
      proxy: {
        enabled: false
      },
      evasion: {
        webdriver: false,
        navigator: false,
        permissions: false,
        webrtc: false,
        timezoneConsistency: false,
        audioContext: false,
        clientRects: false,
        battery: false,
        hardwareAcceleration: false,
        speechSynthesis: false,
        bluetooth: false,
        usb: false,
        midi: false
      }
    },
    browser: {
      type: 'chromium',
      headless: true,
      devtools: false
    },
    resources: {
      blockImages: true,
      blockStylesheets: true,
      blockFonts: true,
      blockMedia: true,
      cacheEnabled: false
    },
    limits: {
      maxPages: 1000,
      maxConcurrency: 10,
      pageTimeout: 10000,
      actionTimeout: 5000,
      navigationTimeout: 10000,
      maxRetries: 1,
      retryDelay: 500
    }
  },

  /**
   * Development configuration
   * Debugging-friendly settings
   */
  development: {
    features: {
      screenshots: true,
      pdf: true,
      video: true,
      tracing: true,
      networkIntercept: true,
      console: true,
      har: true,
      coverage: true
    },
    stealth: {
      enabled: false,
      fingerprint: {
        randomizeViewport: false,
        randomizeUserAgent: false,
        randomizeCanvas: false,
        randomizeWebGL: false,
        randomizeAudio: false,
        randomizeFonts: false
      },
      session: {
        persistCookies: false,
        rotateSession: false
      },
      behavior: {
        humanizeMouseMovement: false,
        randomizeDelays: false,
        delayRange: [0, 0],
        scrollPattern: 'none',
        randomizeClickPositions: false,
        simulateTabbing: false,
        simulateReading: false,
        exitPatterns: false
      },
      proxy: {
        enabled: false
      },
      evasion: {
        webdriver: false,
        navigator: false,
        permissions: false,
        webrtc: false,
        timezoneConsistency: false,
        audioContext: false,
        clientRects: false,
        battery: false,
        hardwareAcceleration: false,
        speechSynthesis: false,
        bluetooth: false,
        usb: false,
        midi: false
      }
    },
    browser: {
      type: 'chromium',
      headless: false,
      devtools: true,
      slowMo: 250
    },
    resources: {
      blockImages: false,
      blockStylesheets: false,
      blockFonts: false,
      blockMedia: false,
      cacheEnabled: true
    },
    limits: {
      maxPages: 10,
      maxConcurrency: 1,
      pageTimeout: 60000,
      actionTimeout: 30000,
      navigationTimeout: 60000,
      maxRetries: 0,
      retryDelay: 0
    }
  }
}

/**
 * Validate and merge configuration with defaults
 */
export function validatePlaywrightConfig(config: Partial<PlaywrightConfig>): PlaywrightConfig {
  const defaultConfig = PLAYWRIGHT_PRESETS.balanced

  return {
    ...defaultConfig,
    ...config,
    features: { ...defaultConfig.features, ...config.features },
    stealth: {
      ...defaultConfig.stealth,
      ...config.stealth,
      fingerprint: { ...defaultConfig.stealth.fingerprint, ...config.stealth?.fingerprint },
      session: { ...defaultConfig.stealth.session, ...config.stealth?.session },
      behavior: { ...defaultConfig.stealth.behavior, ...config.stealth?.behavior },
      proxy: { ...defaultConfig.stealth.proxy, ...config.stealth?.proxy },
      evasion: { ...defaultConfig.stealth.evasion, ...config.stealth?.evasion }
    },
    browser: { ...defaultConfig.browser, ...config.browser },
    resources: { ...defaultConfig.resources, ...config.resources },
    limits: { ...defaultConfig.limits, ...config.limits }
  }
}

/**
 * Calculate anti-detection score
 * Higher score = better protection
 */
export function calculateStealthScore(config: PlaywrightConfig): number {
  let score = 0
  const weights = {
    stealth: 20,
    fingerprint: 30,
    behavior: 25,
    proxy: 15,
    evasion: 10
  }

  // Stealth enabled score
  if (config.stealth.enabled) score += weights.stealth

  // Fingerprint score
  if (config.stealth.fingerprint.randomizeViewport) score += 10
  if (config.stealth.fingerprint.randomizeUserAgent) score += 10
  if (config.stealth.fingerprint.randomizeCanvas) score += 5
  if (config.stealth.fingerprint.randomizeWebGL) score += 5

  // Behavior score
  if (config.stealth.behavior.humanizeMouseMovement) score += 10
  if (config.stealth.behavior.randomizeDelays) score += 10
  if (config.stealth.behavior.simulateReading) score += 5

  // Additional native features
  if (config.stealth.fingerprint.hideWebdriver) score += 5

  // Proxy score
  if (config.stealth.proxy.enabled) {
    if (config.stealth.proxy.type === 'residential') score += weights.proxy
    else if (config.stealth.proxy.type === 'mobile') score += weights.proxy - 5
  }

  // Evasion score
  if (config.stealth.evasion.webdriver) score += 5
  if (config.stealth.evasion.navigator) score += 5

  return Math.min(score, 100)
}

/**
 * Get recommended config based on target site
 */
export function getRecommendedPlaywrightConfig(siteCharacteristics: {
  hasAntiBot?: boolean
  requiresAuth?: boolean
  isGovernment?: boolean
  isBanking?: boolean
  hasCaptcha?: boolean
}): PlaywrightConfig {
  if (siteCharacteristics.isGovernment || siteCharacteristics.isBanking) {
    // Maximum protection for sensitive sites
    return PLAYWRIGHT_PRESETS.maximum_stealth
  }

  if (siteCharacteristics.hasAntiBot || siteCharacteristics.hasCaptcha) {
    // Strong protection for protected sites
    return {
      ...PLAYWRIGHT_PRESETS.maximum_stealth,
      limits: {
        ...PLAYWRIGHT_PRESETS.maximum_stealth.limits,
        maxPages: 20 // Limit for safety
      }
    }
  }

  if (siteCharacteristics.requiresAuth) {
    // Session persistence important
    return {
      ...PLAYWRIGHT_PRESETS.balanced,
      stealth: {
        ...PLAYWRIGHT_PRESETS.balanced.stealth,
        session: {
          persistCookies: true,
          persistLocalStorage: true,
          persistSessionStorage: true,
          rotateSession: false
        }
      }
    }
  }

  // Default to balanced
  return PLAYWRIGHT_PRESETS.balanced
}