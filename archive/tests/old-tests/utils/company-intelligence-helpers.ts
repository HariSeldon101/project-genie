/**
 * Test Utilities for Company Intelligence
 * Helper functions and mock data generators for testing
 */

// UUID generation function
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Types
export interface MockResearchData {
  domain: string;
  basics: {
    companyName: string;
    industry: string;
    founded: number;
    headquarters: string;
    employees: string;
    description: string;
  };
  scraped: {
    pagesProcessed: number;
    totalPages: number;
    successRate: number;
    extractedData: {
      emails: string[];
      phones: string[];
      socialLinks: string[];
      addresses: string[];
    };
  };
  enrichment: {
    competitors: string[];
    marketSize: string;
    growthRate: string;
    techStack: string[];
  };
}

export interface MockSSEEvent {
  type: 'status' | 'progress' | 'result' | 'error' | 'complete';
  data?: any;
  error?: any;
}

/**
 * Generate mock research data for testing
 */
export function generateMockResearchData(domain: string): MockResearchData {
  return {
    domain,
    basics: {
      companyName: domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1),
      industry: 'Technology',
      founded: 2020,
      headquarters: 'San Francisco, CA',
      employees: '50-200',
      description: `A leading technology company specializing in AI solutions.`
    },
    scraped: {
      pagesProcessed: Math.floor(Math.random() * 50) + 10,
      totalPages: Math.floor(Math.random() * 100) + 20,
      successRate: Math.random() * 0.3 + 0.7, // 70-100%
      extractedData: {
        emails: [`contact@${domain}`, `support@${domain}`, `info@${domain}`],
        phones: ['+1-555-0123', '+1-555-0124'],
        socialLinks: [
          `https://twitter.com/${domain.split('.')[0]}`,
          `https://linkedin.com/company/${domain.split('.')[0]}`,
          `https://github.com/${domain.split('.')[0]}`
        ],
        addresses: ['123 Tech Street, San Francisco, CA 94105']
      }
    },
    enrichment: {
      competitors: ['competitor1.com', 'competitor2.com', 'competitor3.com'],
      marketSize: '$50B',
      growthRate: '25% CAGR',
      techStack: ['React', 'Next.js', 'Node.js', 'PostgreSQL', 'AWS']
    }
  };
}

/**
 * Generate mock SSE events for testing
 */
export function generateMockSSEEvents(domain: string): MockSSEEvent[] {
  const events: MockSSEEvent[] = [];
  
  // Initial status
  events.push({
    type: 'status',
    data: {
      status: 'initializing',
      message: 'Starting research process'
    }
  });
  
  // Discovery phase
  events.push({
    type: 'progress',
    data: {
      phase: 'discovering',
      progress: 10,
      message: 'Discovering pages on website',
      pagesFound: 0
    }
  });
  
  // Scraping phase
  for (let i = 1; i <= 5; i++) {
    events.push({
      type: 'progress',
      data: {
        phase: 'scraping',
        progress: 10 + (i * 15),
        message: `Scraping page ${i}/5`,
        pagesCompleted: i,
        pagesTotal: 5
      }
    });
  }
  
  // Extraction phase
  events.push({
    type: 'progress',
    data: {
      phase: 'extracting',
      progress: 85,
      message: 'Extracting company information'
    }
  });
  
  // Enrichment phase
  events.push({
    type: 'progress',
    data: {
      phase: 'enriching',
      progress: 95,
      message: 'Enriching with additional data sources'
    }
  });
  
  // Complete
  events.push({
    type: 'complete',
    data: {
      success: true,
      duration: 45000,
      result: generateMockResearchData(domain)
    }
  });
  
  return events;
}

/**
 * Format SSE event for streaming
 */
export function formatSSEEvent(event: MockSSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Create mock SSE stream
 */
export function createMockSSEStream(events: MockSSEEvent[], delay: number = 100): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      for (const event of events) {
        controller.enqueue(new TextEncoder().encode(formatSSEEvent(event)));
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      controller.close();
    }
  });
}

/**
 * Parse SSE stream data
 */
export async function parseSSEStream(stream: ReadableStream): Promise<MockSSEEvent[]> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const events: MockSSEEvent[] = [];
  let buffer = '';
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6);
          try {
            events.push(JSON.parse(jsonStr));
          } catch (e) {
            console.error('Failed to parse SSE event:', jsonStr);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
  
  return events;
}

/**
 * Mock authentication for tests
 */
export async function mockAuthentication(email: string = 'test@bigfluffy.ai') {
  return {
    user: {
      id: uuidv4(),
      email,
      role: 'authenticated'
    },
    session: {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_at: Date.now() + 3600000 // 1 hour
    }
  };
}

/**
 * Wait for SSE event of specific type
 */
export async function waitForSSEEvent(
  stream: ReadableStream,
  eventType: MockSSEEvent['type'],
  timeout: number = 10000
): Promise<MockSSEEvent | null> {
  const timeoutPromise = new Promise<null>(resolve => 
    setTimeout(() => resolve(null), timeout)
  );
  
  const eventPromise = new Promise<MockSSEEvent | null>(async resolve => {
    const events = await parseSSEStream(stream);
    const targetEvent = events.find(e => e.type === eventType);
    resolve(targetEvent || null);
  });
  
  return Promise.race([eventPromise, timeoutPromise]);
}

/**
 * Mock API error responses
 */
export const mockApiErrors = {
  quotaExceeded: {
    status: 429,
    error: 'insufficient_quota',
    message: 'You exceeded your current quota, please check your plan and billing details.',
    type: 'insufficient_quota',
    code: 'insufficient_quota'
  },
  
  networkError: {
    status: 500,
    error: 'network_error',
    message: 'Failed to connect to the target website',
    code: 'ECONNREFUSED'
  },
  
  timeout: {
    status: 408,
    error: 'timeout',
    message: 'Request timeout after 2 minutes',
    code: 'ETIMEDOUT'
  },
  
  invalidDomain: {
    status: 400,
    error: 'invalid_domain',
    message: 'Invalid domain format',
    code: 'INVALID_DOMAIN'
  },
  
  unauthorized: {
    status: 401,
    error: 'unauthorized',
    message: 'Authentication required',
    code: 'UNAUTHORIZED'
  }
};

/**
 * Generate mock scraper status data
 */
export function generateMockScraperStatus(status: string) {
  return {
    status,
    frameworkDetection: status === 'detecting' ? {
      frameworks: [
        { framework: 'React', confidence: 0.95 },
        { framework: 'Next.js', confidence: 0.88 }
      ],
      recommendedScraper: 'playwright',
      isStatic: false,
      requiresJS: true
    } : undefined,
    currentScraper: 'playwright',
    progress: status === 'scraping' ? Math.floor(Math.random() * 100) : 0,
    logs: [
      {
        timestamp: new Date().toISOString(),
        level: 'info' as const,
        context: 'scraper',
        message: `Status: ${status}`,
        data: null
      }
    ],
    error: status === 'error' ? 'Mock error for testing' : undefined
  };
}

/**
 * Create mock component props
 */
export const mockComponentProps = {
  scraperStatus: {
    idle: generateMockScraperStatus('idle'),
    detecting: generateMockScraperStatus('detecting'),
    scraping: generateMockScraperStatus('scraping'),
    processing: generateMockScraperStatus('processing'),
    completed: generateMockScraperStatus('completed'),
    error: generateMockScraperStatus('error')
  },
  
  researchControls: {
    domain: 'bigfluffy.ai',
    onDomainChange: () => {},
    onStartResearch: () => {},
    onStopResearch: () => {},
    onPauseResearch: () => {},
    isLoading: false,
    isPaused: false,
    status: {
      status: 'idle',
      currentPhase: undefined,
      progress: 0,
      pagesScraped: 0,
      totalPages: 0,
      errors: []
    }
  },
  
  globalConfig: {
    model: 'gpt-5-nano' as any,
    environment: 'testing' as const,
    enableReviewGates: false,
    enableWebSearch: true,
    autoOptimize: false,
    debugMode: false,
    maxBudget: 1.00,
    scraperMode: 'auto' as const
  }
};

/**
 * Assertion helpers for common test scenarios
 */
export const testAssertions = {
  /**
   * Assert SSE event structure
   */
  isValidSSEEvent(event: any): boolean {
    return (
      typeof event === 'object' &&
      ['status', 'progress', 'result', 'error', 'complete'].includes(event.type) &&
      (event.data !== undefined || event.error !== undefined)
    );
  },
  
  /**
   * Assert research data structure
   */
  isValidResearchData(data: any): boolean {
    return (
      typeof data === 'object' &&
      data.domain &&
      data.basics &&
      data.scraped &&
      typeof data.basics.companyName === 'string' &&
      typeof data.scraped.pagesProcessed === 'number'
    );
  },
  
  /**
   * Assert error response structure
   */
  isValidErrorResponse(error: any): boolean {
    return (
      typeof error === 'object' &&
      error.status &&
      error.error &&
      error.message
    );
  }
};

/**
 * Performance measurement utilities
 */
export class PerformanceTracker {
  private marks: Map<string, number> = new Map();
  private measures: Map<string, number> = new Map();
  
  mark(name: string) {
    this.marks.set(name, Date.now());
  }
  
  measure(name: string, startMark: string, endMark?: string) {
    const start = this.marks.get(startMark);
    const end = endMark ? this.marks.get(endMark) : Date.now();
    
    if (start && end) {
      const duration = end - start;
      this.measures.set(name, duration);
      return duration;
    }
    
    return null;
  }
  
  getMeasure(name: string): number | null {
    return this.measures.get(name) || null;
  }
  
  getAllMeasures(): Record<string, number> {
    return Object.fromEntries(this.measures);
  }
  
  reset() {
    this.marks.clear();
    this.measures.clear();
  }
}