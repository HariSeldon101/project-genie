import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock window object for tests
global.window = global.window || {};

// Import components
import { ScraperStatus } from '@/components/company-intelligence/scraper-status';
import { ResearchControls } from '@/components/company-intelligence/research-controls';
import { GlobalConfigBar } from '@/components/company-intelligence/global-config-bar';
import { AllowedModel } from '@/lib/llm/services/model-selector';

describe('ScraperStatus Component', () => {
  it('should render with idle status', () => {
    render(<ScraperStatus status="idle" />);
    expect(screen.getByText('Web Scraper Status')).toBeInTheDocument();
    expect(screen.getByText('Ready to scrape')).toBeInTheDocument();
  });

  it('should accept data prop structure', () => {
    const data = {
      status: 'scraping' as const,
      currentScraper: 'playwright',
      progress: 50,
      logs: [],
      error: undefined
    };
    
    render(<ScraperStatus data={data} />);
    expect(screen.getByText(/Scraping with/)).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('should accept flat prop structure', () => {
    render(
      <ScraperStatus 
        status="scraping"
        currentScraper="cheerio"
        progress={75}
      />
    );
    expect(screen.getByText(/Scraping with/)).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('should display framework detection when available', () => {
    const frameworkDetection = {
      frameworks: [
        { framework: 'React', confidence: 0.95 },
        { framework: 'Next.js', confidence: 0.88 }
      ],
      recommendedScraper: 'playwright',
      isStatic: false,
      requiresJS: true
    };
    
    render(
      <ScraperStatus 
        status="detecting"
        frameworkDetection={frameworkDetection}
      />
    );
    
    expect(screen.getByText('Website Analysis')).toBeInTheDocument();
    expect(screen.getByText('React (95%)')).toBeInTheDocument();
    expect(screen.getByText('Next.js (88%)')).toBeInTheDocument();
    expect(screen.getByText('Dynamic')).toBeInTheDocument();
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('should display error state', () => {
    const error = 'Failed to connect to website';
    
    render(
      <ScraperStatus 
        status="error"
        error={error}
      />
    );
    
    expect(screen.getByText('Scraping failed')).toBeInTheDocument();
    expect(screen.getByText(error)).toBeInTheDocument();
  });

  it('should display activity logs', () => {
    const logs = [
      {
        timestamp: new Date('2025-01-01T12:00:00').toISOString(),
        level: 'info' as const,
        context: 'scraper',
        message: 'Starting scrape',
        data: null
      },
      {
        timestamp: new Date('2025-01-01T12:00:01').toISOString(),
        level: 'error' as const,
        context: 'network',
        message: 'Connection timeout',
        data: { url: 'https://example.com' }
      }
    ];
    
    render(
      <ScraperStatus 
        status="scraping"
        logs={logs}
      />
    );
    
    expect(screen.getByText('Activity Log')).toBeInTheDocument();
    expect(screen.getByText('[scraper]')).toBeInTheDocument();
    expect(screen.getByText('Starting scrape')).toBeInTheDocument();
    expect(screen.getByText('[network]')).toBeInTheDocument();
    expect(screen.getByText('Connection timeout')).toBeInTheDocument();
  });

  it('should show dynamic scraper names correctly', () => {
    const testCases = [
      { scraper: 'auto', expected: 'auto-detected scraper' },
      { scraper: 'static', expected: 'static HTML scraper' },
      { scraper: 'dynamic', expected: 'dynamic JavaScript scraper' },
      { scraper: 'playwright', expected: 'playwright' }
    ];
    
    testCases.forEach(({ scraper, expected }) => {
      const { rerender } = render(
        <ScraperStatus 
          status="scraping"
          currentScraper={scraper}
        />
      );
      expect(screen.getByText(new RegExp(expected))).toBeInTheDocument();
      rerender(<div />); // Clean up for next iteration
    });
  });
});

describe('ResearchControls Component', () => {
  const mockOnDomainChange = vi.fn();
  const mockOnStartResearch = vi.fn();
  const mockOnStopResearch = vi.fn();
  const mockOnPauseResearch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with initial state', () => {
    render(
      <ResearchControls
        domain=""
        onDomainChange={mockOnDomainChange}
        onStartResearch={mockOnStartResearch}
        isLoading={false}
      />
    );
    
    expect(screen.getByLabelText('Company Domain')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start Research/i })).toBeInTheDocument();
  });

  it('should validate empty domain', async () => {
    render(
      <ResearchControls
        domain=""
        onDomainChange={mockOnDomainChange}
        onStartResearch={mockOnStartResearch}
        isLoading={false}
      />
    );
    
    const startButton = screen.getByRole('button', { name: /Start Research/i });
    await userEvent.click(startButton);
    
    expect(screen.getByText('Please enter a domain')).toBeInTheDocument();
    expect(mockOnStartResearch).not.toHaveBeenCalled();
  });

  it('should validate invalid domain format', async () => {
    render(
      <ResearchControls
        domain="not a valid domain!"
        onDomainChange={mockOnDomainChange}
        onStartResearch={mockOnStartResearch}
        isLoading={false}
      />
    );
    
    const startButton = screen.getByRole('button', { name: /Start Research/i });
    await userEvent.click(startButton);
    
    expect(screen.getByText(/Please enter a valid domain/)).toBeInTheDocument();
    expect(mockOnStartResearch).not.toHaveBeenCalled();
  });

  it('should clean and validate domain input', async () => {
    render(
      <ResearchControls
        domain=""
        onDomainChange={mockOnDomainChange}
        onStartResearch={mockOnStartResearch}
        isLoading={false}
      />
    );
    
    const input = screen.getByPlaceholderText('example.com');
    
    // Test URL cleaning
    await userEvent.type(input, 'https://www.example.com/path?query=1');
    
    expect(mockOnDomainChange).toHaveBeenLastCalledWith('example.com');
  });

  it('should start research with valid domain', async () => {
    render(
      <ResearchControls
        domain="bigfluffy.ai"
        onDomainChange={mockOnDomainChange}
        onStartResearch={mockOnStartResearch}
        isLoading={false}
      />
    );
    
    const startButton = screen.getByRole('button', { name: /Start Research/i });
    await userEvent.click(startButton);
    
    expect(mockOnStartResearch).toHaveBeenCalled();
  });

  it('should show loading controls', () => {
    render(
      <ResearchControls
        domain="example.com"
        onDomainChange={mockOnDomainChange}
        onStartResearch={mockOnStartResearch}
        onStopResearch={mockOnStopResearch}
        onPauseResearch={mockOnPauseResearch}
        isLoading={true}
        isPaused={false}
      />
    );
    
    expect(screen.getByRole('button', { name: /Pause/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Stop/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Start Research/i })).not.toBeInTheDocument();
  });

  it('should show resume button when paused', () => {
    render(
      <ResearchControls
        domain="example.com"
        onDomainChange={mockOnDomainChange}
        onStartResearch={mockOnStartResearch}
        onStopResearch={mockOnStopResearch}
        onPauseResearch={mockOnPauseResearch}
        isLoading={true}
        isPaused={true}
      />
    );
    
    expect(screen.getByRole('button', { name: /Resume/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Pause/i })).not.toBeInTheDocument();
  });

  it('should display progress indicators', () => {
    const status = {
      status: 'researching',
      currentPhase: 'Extracting data',
      progress: 45,
      pagesScraped: 12,
      totalPages: 25,
      errors: []
    };
    
    render(
      <ResearchControls
        domain="example.com"
        onDomainChange={mockOnDomainChange}
        onStartResearch={mockOnStartResearch}
        isLoading={true}
        status={status}
      />
    );
    
    expect(screen.getByText('12 pages')).toBeInTheDocument();
    expect(screen.getByText('25 total')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
  });

  it('should display errors', () => {
    const status = {
      status: 'error',
      errors: ['Connection failed', 'Timeout occurred']
    };
    
    render(
      <ResearchControls
        domain="example.com"
        onDomainChange={mockOnDomainChange}
        onStartResearch={mockOnStartResearch}
        isLoading={false}
        status={status as any}
      />
    );
    
    expect(screen.getByText('Timeout occurred')).toBeInTheDocument();
  });

  it('should handle Enter key press', async () => {
    render(
      <ResearchControls
        domain="bigfluffy.ai"
        onDomainChange={mockOnDomainChange}
        onStartResearch={mockOnStartResearch}
        isLoading={false}
      />
    );
    
    const input = screen.getByPlaceholderText('example.com');
    await userEvent.type(input, '{enter}');
    
    expect(mockOnStartResearch).toHaveBeenCalled();
  });
});

describe('GlobalConfigBar Component', () => {
  const mockOnConfigChange = vi.fn();
  const mockOnSessionLoad = vi.fn();
  const mockOnSessionSave = vi.fn();

  const defaultConfig = {
    model: AllowedModel.GPT5_NANO,
    environment: 'testing' as const,
    enableReviewGates: false,
    enableWebSearch: true,
    autoOptimize: false,
    debugMode: false,
    maxBudget: 1.00,
    scraperMode: 'auto' as const
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all configuration options', () => {
    render(
      <GlobalConfigBar
        config={defaultConfig}
        onConfigChange={mockOnConfigChange}
      />
    );
    
    expect(screen.getByLabelText('Model:')).toBeInTheDocument();
    expect(screen.getByLabelText('Scraper:')).toBeInTheDocument();
    expect(screen.getByLabelText(/Review Gates/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Web Search/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Auto-Optimize/)).toBeInTheDocument();
    expect(screen.getByText('TEST')).toBeInTheDocument(); // Environment badge
  });

  it('should change AI model', async () => {
    render(
      <GlobalConfigBar
        config={defaultConfig}
        onConfigChange={mockOnConfigChange}
      />
    );
    
    const modelSelect = screen.getByRole('combobox', { name: /Model/i });
    await userEvent.click(modelSelect);
    await userEvent.click(screen.getByText('GPT-5 Mini'));
    
    expect(mockOnConfigChange).toHaveBeenCalledWith({
      model: AllowedModel.GPT5_MINI
    });
  });

  it('should change scraper mode', async () => {
    render(
      <GlobalConfigBar
        config={defaultConfig}
        onConfigChange={mockOnConfigChange}
      />
    );
    
    const scraperSelect = screen.getByRole('combobox', { name: /Scraper/i });
    await userEvent.click(scraperSelect);
    await userEvent.click(screen.getByText('Static (Fast)'));
    
    expect(mockOnConfigChange).toHaveBeenCalledWith({
      scraperMode: 'static'
    });
  });

  it('should toggle review gates', async () => {
    render(
      <GlobalConfigBar
        config={defaultConfig}
        onConfigChange={mockOnConfigChange}
      />
    );
    
    const reviewGatesSwitch = screen.getByRole('switch', { name: /Review Gates/i });
    await userEvent.click(reviewGatesSwitch);
    
    expect(mockOnConfigChange).toHaveBeenCalledWith({
      enableReviewGates: true
    });
  });

  it('should toggle web search', async () => {
    render(
      <GlobalConfigBar
        config={{...defaultConfig, enableWebSearch: false}}
        onConfigChange={mockOnConfigChange}
      />
    );
    
    const webSearchSwitch = screen.getByRole('switch', { name: /Web Search/i });
    await userEvent.click(webSearchSwitch);
    
    expect(mockOnConfigChange).toHaveBeenCalledWith({
      enableWebSearch: true
    });
  });

  it('should toggle auto-optimize', async () => {
    render(
      <GlobalConfigBar
        config={defaultConfig}
        onConfigChange={mockOnConfigChange}
      />
    );
    
    const autoOptimizeSwitch = screen.getByRole('switch', { name: /Auto-Optimize/i });
    await userEvent.click(autoOptimizeSwitch);
    
    expect(mockOnConfigChange).toHaveBeenCalledWith({
      autoOptimize: true
    });
  });

  it('should toggle debug mode', async () => {
    render(
      <GlobalConfigBar
        config={defaultConfig}
        onConfigChange={mockOnConfigChange}
      />
    );
    
    const debugSwitch = screen.getByRole('switch', { name: /Debug/i });
    await userEvent.click(debugSwitch);
    
    expect(mockOnConfigChange).toHaveBeenCalledWith({
      debugMode: true
    });
  });

  it('should display budget indicator', () => {
    render(
      <GlobalConfigBar
        config={{...defaultConfig, maxBudget: 5.50}}
        onConfigChange={mockOnConfigChange}
      />
    );
    
    expect(screen.getByText('$5.50')).toBeInTheDocument();
  });

  it('should display environment badge', () => {
    render(
      <GlobalConfigBar
        config={{...defaultConfig, environment: 'production'}}
        onConfigChange={mockOnConfigChange}
      />
    );
    
    expect(screen.getByText('PROD')).toBeInTheDocument();
  });

  it('should dispatch custom event for advanced settings', async () => {
    const mockDispatchEvent = vi.fn();
    window.dispatchEvent = mockDispatchEvent;
    
    render(
      <GlobalConfigBar
        config={defaultConfig}
        onConfigChange={mockOnConfigChange}
      />
    );
    
    const settingsButton = screen.getByRole('button', { name: /settings/i });
    await userEvent.click(settingsButton);
    
    expect(mockDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'openAdvancedSettings'
      })
    );
  });

  it('should show session status when active', () => {
    const sessionStatus = {
      isActive: true,
      sessionName: 'Research Session 1',
      stage: 'extraction'
    };
    
    render(
      <GlobalConfigBar
        config={defaultConfig}
        onConfigChange={mockOnConfigChange}
        sessionStatus={sessionStatus}
      />
    );
    
    expect(screen.getByText('extraction')).toBeInTheDocument();
  });
});