# Complete LLM-Powered Help System Implementation Guide
## Next.js + Supabase + Syncfusion + Playwright + GPT Integration

## Project Overview

This guide provides complete implementation instructions for Claude Code (in Cursor/VSCode) to build an AI-powered help system with automated screenshot capture using your existing infrastructure:

- **Framework**: Next.js 14+ (App Router)
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **UI Components**: Syncfusion (Full License)
- **Testing**: Playwright (Existing test suite)
- **LLM**: OpenAI GPT-4/5 (GPT-5 nano when available)
- **Deployment**: Vercel
- **Version Control**: GitHub

## Table of Contents

1. [Complete Dependencies](#complete-dependencies)
2. [Supabase Database Setup](#supabase-database-setup)
3. [Environment Configuration](#environment-configuration)
4. [Converting Existing Playwright Tests](#converting-existing-playwright-tests)
5. [Core Help System Implementation](#core-help-system-implementation)
6. [Playwright Screenshot Integration](#playwright-screenshot-integration)
7. [API Routes](#api-routes)
8. [GitHub Actions Setup](#github-actions-setup)
9. [Usage Instructions](#usage-instructions)

## Complete Dependencies

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "@supabase/auth-helpers-nextjs": "^0.8.0",
    "@syncfusion/ej2-react-richtexteditor": "^25.1.35",
    "@syncfusion/ej2-react-diagrams": "^25.1.35",
    "@syncfusion/ej2-react-navigations": "^25.1.35",
    "@syncfusion/ej2-react-layouts": "^25.1.35",
    "@syncfusion/ej2-react-documenteditor": "^25.1.35",
    "@syncfusion/ej2-react-pdfviewer": "^25.1.35",
    "@syncfusion/ej2-react-dropdowns": "^25.1.35",
    "@syncfusion/ej2-react-popups": "^25.1.35",
    "@syncfusion/ej2-react-notifications": "^25.1.35",
    "@syncfusion/ej2-react-image-editor": "^25.1.35",
    "@syncfusion/ej2-react-buttons": "^25.1.35",
    "@syncfusion/ej2-react-grids": "^25.1.35",
    "@syncfusion/ej2-data": "^25.1.35",
    "@syncfusion/ej2-base": "^25.1.35",
    "openai": "^4.28.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "next": "^14.0.0",
    "@babel/parser": "^7.23.0",
    "@babel/traverse": "^7.23.0",
    "sharp": "^0.33.0",
    "gray-matter": "^4.0.3",
    "react-hot-toast": "^2.4.1",
    "@playwright/test": "^1.40.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0",
    "tsx": "^4.0.0",
    "wait-on": "^7.0.0"
  }
}
```

## Supabase Database Setup

Execute this SQL in your Supabase SQL Editor:

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Categories for organizing help content
CREATE TABLE help_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  parent_id UUID REFERENCES help_categories(id),
  icon TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Main documentation articles
CREATE TABLE help_articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT,
  markdown_content TEXT,
  category_id UUID REFERENCES help_categories(id),
  metadata JSONB DEFAULT '{}',
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'B')
  ) STORED,
  auto_generated BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Diagrams and flowcharts
CREATE TABLE help_diagrams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID REFERENCES help_articles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  diagram_data JSONB NOT NULL,
  svg_content TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media assets including screenshots
CREATE TABLE help_media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID REFERENCES help_articles(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  public_url TEXT,
  metadata JSONB DEFAULT '{}',
  caption TEXT,
  alt_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Playwright screenshot documentation
CREATE TABLE help_screenshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  test_name TEXT NOT NULL,
  test_path TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  public_url TEXT,
  title TEXT,
  description TEXT,
  annotations JSONB DEFAULT '[]',
  viewport JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User flows captured from Playwright
CREATE TABLE help_flows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_name TEXT NOT NULL,
  flow_name TEXT NOT NULL,
  screenshots UUID[] DEFAULT '{}',
  steps JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Search analytics
CREATE TABLE help_search_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  query TEXT NOT NULL,
  results_count INTEGER,
  clicked_result UUID REFERENCES help_articles(id),
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI generation logs
CREATE TABLE help_generation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt TEXT,
  model TEXT,
  article_id UUID REFERENCES help_articles(id),
  tokens_used INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_help_articles_search ON help_articles USING GIN(search_vector);
CREATE INDEX idx_help_articles_category ON help_articles(category_id);
CREATE INDEX idx_help_articles_slug ON help_articles(slug);
CREATE INDEX idx_help_articles_status ON help_articles(status);
CREATE INDEX idx_help_screenshots_test ON help_screenshots(test_name);
CREATE INDEX idx_help_search_analytics_query ON help_search_analytics(query);

-- Enable Row Level Security
ALTER TABLE help_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_diagrams ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_screenshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Help content is viewable by everyone" 
  ON help_articles FOR SELECT 
  USING (status = 'published' OR auth.uid() IS NOT NULL);

CREATE POLICY "Help content is editable by authenticated users" 
  ON help_articles FOR ALL 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Categories are viewable by everyone" 
  ON help_categories FOR SELECT 
  USING (true);

CREATE POLICY "Screenshots are viewable by everyone" 
  ON help_screenshots FOR SELECT 
  USING (true);

-- Functions for search
CREATE OR REPLACE FUNCTION search_help_articles(search_query TEXT)
RETURNS TABLE (
  id UUID,
  title TEXT,
  slug TEXT,
  content TEXT,
  category_id UUID,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ha.id,
    ha.title,
    ha.slug,
    ha.content,
    ha.category_id,
    ts_rank(ha.search_vector, websearch_to_tsquery('english', search_query)) AS rank
  FROM help_articles ha
  WHERE ha.search_vector @@ websearch_to_tsquery('english', search_query)
    AND ha.status = 'published'
  ORDER BY rank DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_help_articles_updated_at
  BEFORE UPDATE ON help_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_help_categories_updated_at
  BEFORE UPDATE ON help_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Create storage buckets (run in Supabase Dashboard)
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create bucket: 'help-media' (public)
-- 3. Add policy for public access
```

## Environment Configuration

```env
# .env.local
# Supabase (existing)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Syncfusion (existing - full license)
NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY=Ngo9BigBOggjHTQxAR8/V1NCaF1cWWhAYVF/WmFZfVpgdVRMYF5bR3NPMyBoS35RckViWHxec3RVRmJfUkd3

# OpenAI GPT Configuration
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_ORG_ID=org-... # Optional

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Vercel (Production)
VERCEL_URL=your-app.vercel.app

# GitHub (for Actions)
GITHUB_TOKEN=ghp_...
GITHUB_REPO=your-username/your-repo

# Feature Flags
CAPTURE_DOCS=false
UPLOAD_SCREENSHOTS=false
ENABLE_AI_ANNOTATIONS=true
```

## Converting Existing Playwright Tests

### Example: Converting Your Existing Test

**Before (Standard Playwright Test):**
```typescript
// tests/e2e/user-journey.spec.ts
import { test, expect } from '@playwright/test';

test('user completes signup', async ({ page }) => {
  await page.goto('/signup');
  await page.fill('#email', 'test@example.com');
  await page.fill('#password', 'Test123!');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/dashboard');
});
```

**After (With Documentation Capture):**
```typescript
// tests/e2e/user-journey.spec.ts
import { test, expect } from '../fixtures/documentation-fixture';

test.describe('User Journey - Documentation', () => {
  test('user completes signup with documentation', async ({ page, docs }) => {
    // Navigate to signup
    await page.goto('/signup');
    
    // Capture empty form
    await docs.captureAnnotatedScreenshot('01-signup-empty.png', {
      title: 'Sign Up Page',
      description: 'Initial signup form',
      annotations: [
        {
          type: 'number',
          target: '#email',
          text: 'Enter email address'
        },
        {
          type: 'number',
          target: '#password',
          text: 'Create strong password'
        },
        {
          type: 'arrow',
          target: 'button[type="submit"]',
          text: 'Submit when ready',
          position: 'bottom'
        }
      ],
      highlight: ['form']
    });
    
    // Fill form
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'Test123!');
    
    // Capture filled form (with sensitive data blurred)
    await docs.captureAnnotatedScreenshot('02-signup-filled.png', {
      title: 'Completed Sign Up Form',
      description: 'Form with example data',
      blur: ['#email', '#password'], // Auto-blur sensitive fields
      annotations: [
        {
          type: 'box',
          target: 'form',
          color: '#4CAF50'
        }
      ]
    });
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await expect(page).toHaveURL('/dashboard');
    
    // Capture success state
    await docs.captureAnnotatedScreenshot('03-dashboard-welcome.png', {
      title: 'Dashboard Welcome',
      description: 'User lands on dashboard after successful signup',
      annotations: [
        {
          type: 'circle',
          target: '[data-testid="welcome-message"]',
          color: '#2196F3'
        }
      ],
      captureFullPage: true
    });
  });
  
  // Keep original test for functional testing
  test('user completes signup (functional)', async ({ page }) => {
    await page.goto('/signup');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'Test123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });
});
```

## Core Help System Implementation

### Directory Structure

```
your-nextjs-app/
├── src/
│   ├── components/
│   │   └── HelpSystem/
│   │       ├── index.tsx
│   │       ├── HelpEditor.tsx
│   │       ├── HelpNavigation.tsx
│   │       ├── HelpSearch.tsx
│   │       ├── DiagramBuilder.tsx
│   │       ├── ScreenshotAnnotator.tsx
│   │       ├── PlaywrightIntegration.tsx
│   │       └── PDFHelpViewer.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   └── client.ts
│   │   ├── screenshot/
│   │   │   └── capture-service.ts
│   │   └── ai/
│   │       └── gpt-client.ts
│   ├── app/
│   │   ├── api/
│   │   │   ├── help/
│   │   │   │   ├── generate/route.ts
│   │   │   │   ├── search/route.ts
│   │   │   │   └── analyze-screenshot/route.ts
│   │   │   └── playwright/
│   │   │       └── capture/route.ts
│   │   └── help/
│   │       └── page.tsx
├── tests/
│   ├── fixtures/
│   │   └── documentation-fixture.ts
│   ├── reporters/
│   │   └── screenshot-reporter.ts
│   └── e2e/
│       └── (your existing tests)
├── scripts/
│   ├── generate-docs.ts
│   └── sync-screenshots.ts
└── playwright.config.ts
```

### 1. Main Help System Component

```tsx
// src/components/HelpSystem/index.tsx
import React, { useState, useEffect } from 'react';
import { registerLicense } from '@syncfusion/ej2-base';
import { SplitterComponent, PanesDirective, PaneDirective } from '@syncfusion/ej2-react-layouts';
import { TabComponent, TabItemsDirective, TabItemDirective } from '@syncfusion/ej2-react-navigations';
import { ToastComponent } from '@syncfusion/ej2-react-notifications';
import { supabase } from '@/lib/supabase/client';
import toast, { Toaster } from 'react-hot-toast';
import HelpEditor from './HelpEditor';
import HelpNavigation from './HelpNavigation';
import HelpSearch from './HelpSearch';
import DiagramBuilder from './DiagramBuilder';
import ScreenshotAnnotator from './ScreenshotAnnotator';
import PlaywrightIntegration from './PlaywrightIntegration';
import PDFHelpViewer from './PDFHelpViewer';

// Register Syncfusion license
registerLicense(process.env.NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY!);

export default function HelpSystem() {
  const [activeArticle, setActiveArticle] = useState(null);
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const toastRef = React.useRef<ToastComponent>(null);

  useEffect(() => {
    loadData();
    subscribeToChanges();
  }, []);

  const loadData = async () => {
    const [articlesResult, categoriesResult] = await Promise.all([
      supabase.from('help_articles').select('*').order('updated_at', { ascending: false }),
      supabase.from('help_categories').select('*').order('order_index')
    ]);

    if (!articlesResult.error) setArticles(articlesResult.data);
    if (!categoriesResult.error) setCategories(categoriesResult.data);
  };

  const subscribeToChanges = () => {
    const channel = supabase
      .channel('help_system_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'help_articles' },
        payload => {
          console.log('Article changed:', payload);
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const saveArticle = async (article: any) => {
    setLoading(true);
    try {
      const { data, error } = article.id
        ? await supabase
            .from('help_articles')
            .update({
              ...article,
              updated_at: new Date().toISOString(),
              version: article.version + 1
            })
            .eq('id', article.id)
            .select()
            .single()
        : await supabase
            .from('help_articles')
            .insert(article)
            .select()
            .single();

      if (error) throw error;
      
      toast.success('Article saved successfully');
      setActiveArticle(data);
      loadData();
    } catch (error) {
      toast.error('Failed to save article');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const insertContent = (content: string) => {
    // This will be called by screenshot tools to insert content
    if (window.helpEditorRef?.current) {
      window.helpEditorRef.current.executeCommand('insertHTML', content);
    }
  };

  return (
    <div className="help-system-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Toaster position="top-right" />
      
      <div className="help-header p-4 border-b flex items-center gap-4">
        <HelpSearch onSelect={setActiveArticle} />
        <div className="ml-auto flex gap-2">
          <button 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => setActiveArticle(null)}
          >
            ➕ New Article
          </button>
        </div>
      </div>
      
      <SplitterComponent 
        height="calc(100% - 64px)"
        paneSettings={[
          { size: '250px', min: '200px', max: '400px' },
          { size: '70%' },
          { size: '30%', min: '300px' }
        ]}
      >
        <PanesDirective>
          {/* Navigation Pane */}
          <PaneDirective>
            <HelpNavigation 
              articles={articles}
              categories={categories}
              activeArticle={activeArticle}
              onSelect={setActiveArticle}
            />
          </PaneDirective>
          
          {/* Main Content Pane */}
          <PaneDirective>
            <TabComponent>
              <TabItemsDirective>
                <TabItemDirective header={{ text: '✏️ Editor' }}>
                  <HelpEditor 
                    article={activeArticle}
                    onSave={saveArticle}
                    loading={loading}
                  />
                </TabItemDirective>
                <TabItemDirective header={{ text: '📸 Screenshots' }}>
                  <PlaywrightIntegration 
                    onInsert={insertContent}
                    articleId={activeArticle?.id}
                  />
                </TabItemDirective>
                <TabItemDirective header={{ text: '🎨 Annotate' }}>
                  <ScreenshotAnnotator
                    onSave={(url) => insertContent(`<img src="${url}" />`)}
                    articleId={activeArticle?.id}
                  />
                </TabItemDirective>
                <TabItemDirective header={{ text: '📊 Diagrams' }}>
                  <DiagramBuilder 
                    article={activeArticle}
                    onSave={saveArticle}
                  />
                </TabItemDirective>
                <TabItemDirective header={{ text: '📄 PDF' }}>
                  <PDFHelpViewer 
                    article={activeArticle}
                  />
                </TabItemDirective>
              </TabItemsDirective>
            </TabComponent>
          </PaneDirective>
          
          {/* Preview Pane */}
          <PaneDirective>
            <div className="preview-pane p-4 h-full overflow-auto">
              <h3 className="text-lg font-bold mb-4">Preview</h3>
              {activeArticle ? (
                <div 
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: activeArticle.content || '' }} 
                />
              ) : (
                <p className="text-gray-500">Select an article to preview</p>
              )}
            </div>
          </PaneDirective>
        </PanesDirective>
      </SplitterComponent>
      
      <ToastComponent ref={toastRef} position={{ X: 'Right', Y: 'Top' }} />
    </div>
  );
}
```

### 2. Supabase Client Setup

```typescript
// src/lib/supabase/client.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export type Database = {
  public: {
    Tables: {
      help_articles: {
        Row: {
          id: string;
          title: string;
          slug: string;
          content: string | null;
          markdown_content: string | null;
          category_id: string | null;
          metadata: any;
          auto_generated: boolean;
          version: number;
          status: string;
          created_at: string;
          updated_at: string;
        };
      };
      help_screenshots: {
        Row: {
          id: string;
          test_name: string;
          test_path: string | null;
          file_name: string;
          file_path: string;
          public_url: string | null;
          title: string | null;
          description: string | null;
          annotations: any[];
          viewport: any | null;
          metadata: any;
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
};

export const supabase = createClientComponentClient<Database>();
```

## Playwright Screenshot Integration

### 1. Documentation Test Fixture

```typescript
// tests/fixtures/documentation-fixture.ts
import { test as base, expect, Page, Locator } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type AnnotationType = 'arrow' | 'box' | 'circle' | 'blur' | 'highlight' | 'number';

export interface Annotation {
  type: AnnotationType;
  target: string | Locator;
  text?: string;
  color?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  offset?: { x: number; y: number };
}

export interface DocumentationOptions {
  title: string;
  description: string;
  annotations?: Annotation[];
  highlight?: string[];
  blur?: string[];
  waitForAnimation?: boolean;
  captureFullPage?: boolean;
}

class DocumentationHelper {
  constructor(private page: Page) {}

  async captureAnnotatedScreenshot(
    fileName: string,
    options: DocumentationOptions
  ): Promise<string> {
    // Apply highlights
    if (options.highlight) {
      await this.highlightElements(options.highlight);
    }

    // Apply blur
    if (options.blur) {
      await this.blurElements(options.blur);
    }

    // Wait for animations
    if (options.waitForAnimation) {
      await this.page.waitForTimeout(500);
    }

    // Take screenshot
    const screenshotBuffer = await this.page.screenshot({
      fullPage: options.captureFullPage || false,
      animations: 'disabled'
    });

    // Apply annotations
    let annotatedBuffer = screenshotBuffer;
    if (options.annotations && options.annotations.length > 0) {
      annotatedBuffer = await this.applyAnnotations(screenshotBuffer, options.annotations);
    }

    // Save screenshot
    const savedPath = await this.saveScreenshot(fileName, annotatedBuffer, options);
    
    // Clean up styles
    await this.cleanupStyles();
    
    return savedPath;
  }

  private async highlightElements(selectors: string[]) {
    await this.page.evaluate((selectors) => {
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const element = el as HTMLElement;
          element.setAttribute('data-highlighted', 'true');
          element.style.outline = '3px solid #FF6B6B';
          element.style.outlineOffset = '2px';
          element.style.boxShadow = '0 0 20px rgba(255, 107, 107, 0.5)';
        });
      });
    }, selectors);
  }

  private async blurElements(selectors: string[]) {
    await this.page.evaluate((selectors) => {
      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const element = el as HTMLElement;
          element.setAttribute('data-blurred', 'true');
          element.style.filter = 'blur(8px)';
        });
      });
    }, selectors);
  }

  private async cleanupStyles() {
    await this.page.evaluate(() => {
      document.querySelectorAll('[data-highlighted]').forEach(el => {
        const element = el as HTMLElement;
        element.style.outline = '';
        element.style.outlineOffset = '';
        element.style.boxShadow = '';
        element.removeAttribute('data-highlighted');
      });
      
      document.querySelectorAll('[data-blurred]').forEach(el => {
        const element = el as HTMLElement;
        element.style.filter = '';
        element.removeAttribute('data-blurred');
      });
    });
  }

  private async applyAnnotations(
    screenshotBuffer: Buffer,
    annotations: Annotation[]
  ): Promise<Buffer> {
    const image = sharp(screenshotBuffer);
    const metadata = await image.metadata();
    
    const svgAnnotations = await this.createSVGAnnotations(
      annotations,
      metadata.width!,
      metadata.height!
    );
    
    return await image
      .composite([{
        input: Buffer.from(svgAnnotations),
        top: 0,
        left: 0
      }])
      .png()
      .toBuffer();
  }

  private async createSVGAnnotations(
    annotations: Annotation[],
    width: number,
    height: number
  ): Promise<string> {
    const svgElements: string[] = [];
    let stepNumber = 1;

    for (const annotation of annotations) {
      const position = await this.getElementPosition(annotation.target);
      if (!position) continue;

      const color = annotation.color || '#FF6B6B';
      
      switch (annotation.type) {
        case 'arrow':
          const offset = annotation.offset || { x: -100, y: -50 };
          svgElements.push(`
            <g>
              <defs>
                <marker id="arrowhead-${stepNumber}" markerWidth="10" markerHeight="7" 
                  refX="10" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="${color}" />
                </marker>
              </defs>
              <line x1="${position.x + position.width/2 + offset.x}" 
                    y1="${position.y + position.height/2 + offset.y}" 
                    x2="${position.x + position.width/2}" 
                    y2="${position.y + position.height/2}" 
                stroke="${color}" stroke-width="3" marker-end="url(#arrowhead-${stepNumber})" />
              ${annotation.text ? `
                <text x="${position.x + position.width/2 + offset.x}" 
                      y="${position.y + position.height/2 + offset.y - 10}" 
                      fill="${color}" font-size="16" font-weight="bold">
                  ${annotation.text}
                </text>
              ` : ''}
            </g>
          `);
          break;
          
        case 'number':
          const x = position.x - 30;
          const y = position.y + position.height / 2;
          svgElements.push(`
            <g>
              <circle cx="${x}" cy="${y}" r="20" fill="${color}" />
              <text x="${x}" y="${y + 5}" text-anchor="middle" 
                    fill="white" font-size="18" font-weight="bold">
                ${stepNumber}
              </text>
              ${annotation.text ? `
                <text x="${x + 40}" y="${y + 5}" 
                      fill="${color}" font-size="14">
                  ${annotation.text}
                </text>
              ` : ''}
            </g>
          `);
          stepNumber++;
          break;
          
        case 'box':
          svgElements.push(`
            <rect x="${position.x - 5}" y="${position.y - 5}" 
                  width="${position.width + 10}" height="${position.height + 10}" 
                  fill="none" stroke="${color}" stroke-width="3" rx="5" />
          `);
          break;
      }
    }

    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        ${svgElements.join('\n')}
      </svg>
    `;
  }

  private async getElementPosition(target: string | Locator) {
    const locator = typeof target === 'string' ? this.page.locator(target) : target;
    try {
      return await locator.boundingBox();
    } catch {
      return null;
    }
  }

  private async saveScreenshot(
    fileName: string,
    buffer: Buffer,
    options: DocumentationOptions
  ): Promise<string> {
    // Save locally
    const localDir = path.join(process.cwd(), 'docs', 'screenshots');
    await fs.mkdir(localDir, { recursive: true });
    const localPath = path.join(localDir, fileName);
    await fs.writeFile(localPath, buffer);

    // Upload to Supabase if configured
    if (process.env.UPLOAD_SCREENSHOTS === 'true') {
      const { data, error } = await supabase.storage
        .from('help-media')
        .upload(`screenshots/${fileName}`, buffer, {
          contentType: 'image/png',
          upsert: true
        });

      if (!error) {
        await supabase.from('help_screenshots').insert({
          file_name: fileName,
          file_path: `screenshots/${fileName}`,
          title: options.title,
          description: options.description,
          annotations: options.annotations || [],
          test_name: test.info().title,
          test_path: test.info().titlePath.join(' > '),
          metadata: {
            captureDate: new Date().toISOString()
          }
        });

        const { data: { publicUrl } } = supabase.storage
          .from('help-media')
          .getPublicUrl(`screenshots/${fileName}`);

        return publicUrl;
      }
    }

    return localPath;
  }
}

export const test = base.extend<{
  docs: DocumentationHelper;
}>({
  docs: async ({ page }, use) => {
    const helper = new DocumentationHelper(page);
    await use(helper);
  }
});

export { expect };
```

### 2. Playwright Integration Component

```tsx
// src/components/HelpSystem/PlaywrightIntegration.tsx
import React, { useState, useEffect } from 'react';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { TreeViewComponent } from '@syncfusion/ej2-react-navigations';
import { DialogComponent } from '@syncfusion/ej2-react-popups';
import { GridComponent, ColumnsDirective, ColumnDirective } from '@syncfusion/ej2-react-grids';
import { supabase } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

interface PlaywrightIntegrationProps {
  onInsert: (content: string) => void;
  articleId?: string;
}

export default function PlaywrightIntegration({ onInsert, articleId }: PlaywrightIntegrationProps) {
  const [screenshots, setScreenshots] = useState<any[]>([]);
  const [flows, setFlows] = useState<any[]>([]);
  const [selectedScreenshot, setSelectedScreenshot] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadScreenshots();
    loadFlows();
  }, []);

  const loadScreenshots = async () => {
    const { data, error } = await supabase
      .from('help_screenshots')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (!error && data) {
      setScreenshots(data);
    }
  };

  const loadFlows = async () => {
    const { data, error } = await supabase
      .from('help_flows')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setFlows(data);
    }
  };

  const runPlaywrightTests = async (testPattern?: string) => {
    setLoading(true);
    toast.loading('Running Playwright tests to capture screenshots...');
    
    try {
      const response = await fetch('/api/playwright/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          testPattern: testPattern || 'Documentation',
          project: 'chromium-docs'
        })
      });
      
      if (response.ok) {
        const { screenshots } = await response.json();
        toast.success(`Captured ${screenshots.length} screenshots`);
        await loadScreenshots();
      } else {
        toast.error('Failed to capture screenshots');
      }
    } catch (error) {
      toast.error('Error running tests');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const insertScreenshot = (screenshot: any) => {
    const content = `
<figure class="help-screenshot">
  <img src="${screenshot.public_url}" alt="${screenshot.title}" />
  <figcaption>${screenshot.description || screenshot.title}</figcaption>
</figure>
    `;
    onInsert(content.trim());
    toast.success('Screenshot inserted');
  };

  const insertFlow = async (flow: any) => {
    if (!flow.screenshots || flow.screenshots.length === 0) {
      toast.error('Flow has no screenshots');
      return;
    }

    const screenshotData = await Promise.all(
      flow.screenshots.map(async (id: string) => {
        const { data } = await supabase
          .from('help_screenshots')
          .select('*')
          .eq('id', id)
          .single();
        return data;
      })
    );

    const content = `
<div class="help-flow">
  <h3>${flow.flow_name}</h3>
  ${screenshotData.map((s, i) => `
  <div class="flow-step">
    <h4>Step ${i + 1}: ${s?.title}</h4>
    <img src="${s?.public_url}" alt="${s?.title}" />
    <p>${s?.description}</p>
  </div>
  `).join('\n')}
</div>
    `;
    
    onInsert(content.trim());
    toast.success('Flow inserted');
  };

  const previewScreenshot = (screenshot: any) => {
    setSelectedScreenshot(screenshot);
    setShowPreview(true);
  };

  return (
    <div className="playwright-integration p-4">
      <div className="toolbar mb-4 flex gap-2">
        <ButtonComponent 
          onClick={() => runPlaywrightTests()}
          isPrimary={true}
          disabled={loading}
        >
          🎭 Run All Documentation Tests
        </ButtonComponent>
        
        <ButtonComponent 
          onClick={() => runPlaywrightTests('onboarding')}
          cssClass="e-outline"
          disabled={loading}
        >
          📸 Capture Onboarding Flow
        </ButtonComponent>
        
        <ButtonComponent 
          onClick={() => runPlaywrightTests('dashboard')}
          cssClass="e-outline"
          disabled={loading}
        >
          📸 Capture Dashboard
        </ButtonComponent>
        
        <ButtonComponent 
          onClick={loadScreenshots}
          cssClass="e-outline"
          disabled={loading}
        >
          🔄 Refresh
        </ButtonComponent>
      </div>

      <div className="content-area">
        <h3 className="text-lg font-bold mb-2">Recent Screenshots</h3>
        
        <GridComponent 
          dataSource={screenshots}
          height={400}
          allowPaging={true}
          pageSettings={{ pageSize: 10 }}
        >
          <ColumnsDirective>
            <ColumnDirective 
              field="title" 
              headerText="Title" 
              width="200" 
            />
            <ColumnDirective 
              field="test_name" 
              headerText="Test" 
              width="150" 
            />
            <ColumnDirective 
              field="created_at" 
              headerText="Created" 
              width="120"
              format="yMd"
              type="date"
            />
            <ColumnDirective 
              headerText="Actions" 
              width="150"
              template={(props: any) => (
                <div className="flex gap-2">
                  <button 
                    className="text-blue-500 hover:underline"
                    onClick={() => previewScreenshot(props)}
                  >
                    👁️ Preview
                  </button>
                  <button 
                    className="text-green-500 hover:underline"
                    onClick={() => insertScreenshot(props)}
                  >
                    ➕ Insert
                  </button>
                </div>
              )}
            />
          </ColumnsDirective>
        </GridComponent>

        <h3 className="text-lg font-bold mt-6 mb-2">Captured Flows</h3>
        
        <div className="flows-list">
          {flows.map(flow => (
            <div 
              key={flow.id} 
              className="flow-item p-3 border rounded mb-2 hover:bg-gray-50 cursor-pointer"
              onClick={() => insertFlow(flow)}
            >
              <div className="font-semibold">{flow.feature_name}</div>
              <div className="text-sm text-gray-600">{flow.flow_name}</div>
              <div className="text-xs text-gray-500">
                {flow.screenshots?.length || 0} screenshots
              </div>
            </div>
          ))}
        </div>
      </div>

      <DialogComponent
        visible={showPreview}
        width="80%"
        height="80%"
        header={selectedScreenshot?.title}
        showCloseIcon={true}
        close={() => setShowPreview(false)}
      >
        {selectedScreenshot && (
          <div className="preview-content p-4">
            <img 
              src={selectedScreenshot.public_url} 
              alt={selectedScreenshot.title}
              className="max-w-full h-auto"
            />
            <div className="mt-4">
              <p className="font-semibold">Description:</p>
              <p>{selectedScreenshot.description}</p>
              <p className="font-semibold mt-2">Test Path:</p>
              <p className="text-sm text-gray-600">{selectedScreenshot.test_path}</p>
            </div>
          </div>
        )}
      </DialogComponent>
    </div>
  );
}
```

## API Routes

### 1. GPT Content Generation

```typescript
// src/app/api/help/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { prompt, context, articleTitle, model = 'gpt-4-turbo-preview' } = await request.json();
    
    const systemPrompt = `You are a technical documentation expert. Generate comprehensive, well-structured documentation for a help system. Include:
    - Clear explanations with proper headings
    - Step-by-step instructions where appropriate
    - Code examples with syntax highlighting
    - Troubleshooting tips
    - Best practices and warnings
    Format the output as clean HTML suitable for a rich text editor.`;
    
    const completion = await openai.chat.completions.create({
      model: model === 'gpt-5-nano' && !isModelAvailable('gpt-5-nano') ? 'gpt-4-turbo-preview' : model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `
          Article Title: ${articleTitle || 'Documentation'}
          Current Content Context: ${context || 'No existing content'}
          User Request: ${prompt}
          
          Generate helpful documentation that directly addresses this request.
        `}
      ],
      temperature: 0.7,
      max_tokens: 4000
    });
    
    const generatedContent = completion.choices[0].message.content;
    
    // Log generation
    await supabase.from('help_generation_logs').insert({
      prompt,
      model,
      article_title: articleTitle,
      tokens_used: completion.usage?.total_tokens
    });
    
    return NextResponse.json({ content: generatedContent });
    
  } catch (error) {
    console.error('Generation error:', error);
    return NextResponse.json({ error: 'Failed to generate content' }, { status: 500 });
  }
}

function isModelAvailable(model: string): boolean {
  const availableModels = ['gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo'];
  return availableModels.includes(model);
}
```

### 2. Playwright Test Runner API

```typescript
// src/app/api/playwright/capture/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createClient } from '@supabase/supabase-js';

const execAsync = promisify(exec);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { testPattern = 'Documentation', project = 'chromium-docs' } = await request.json();
    
    // Set environment variables for the test run
    const env = {
      ...process.env,
      CAPTURE_DOCS: 'true',
      UPLOAD_SCREENSHOTS: 'true',
      HEADLESS: 'true'
    };
    
    // Run Playwright tests
    const command = `npx playwright test --grep="${testPattern}" --project=${project}`;
    
    console.log(`Running: ${command}`);
    
    const { stdout, stderr } = await execAsync(command, { env });
    
    if (stderr && !stderr.includes('warning')) {
      console.error('Playwright stderr:', stderr);
    }
    
    // Get the newly created screenshots
    const { data: screenshots } = await supabase
      .from('help_screenshots')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    
    return NextResponse.json({ 
      success: true,
      screenshots: screenshots || [],
      output: stdout
    });
    
  } catch (error: any) {
    console.error('Playwright capture error:', error);
    return NextResponse.json({ 
      error: 'Failed to run tests',
      details: error.message 
    }, { status: 500 });
  }
}
```

## GitHub Actions Setup

```yaml
# .github/workflows/documentation.yml
name: Generate Documentation

on:
  push:
    branches: [main]
    paths:
      - 'src/**/*.tsx'
      - 'src/**/*.ts'
      - 'tests/**/*.spec.ts'
  schedule:
    - cron: '0 2 * * 1' # Weekly on Monday
  workflow_dispatch:

env:
  NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
  NEXT_PUBLIC_SYNCFUSION_LICENSE_KEY: ${{ secrets.SYNCFUSION_LICENSE }}
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
  CAPTURE_DOCS: true
  UPLOAD_SCREENSHOTS: true

jobs:
  generate-documentation:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: |
          npm ci
          npx playwright install chromium
          npx playwright install-deps
      
      - name: Build application
        run: npm run build
      
      - name: Start application
        run: |
          npm run start &
          npx wait-on http://localhost:3000 --timeout 60000
      
      - name: Run documentation tests
        run: |
          npx playwright test --grep="Documentation" --project=chromium-docs
      
      - name: Generate AI documentation
        run: npm run generate:docs
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: documentation
          path: |
            docs/
            playwright-report/
      
      - name: Deploy to Vercel
        if: github.ref == 'refs/heads/main'
        run: |
          npx vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

## Usage Instructions

### Initial Setup (One-time)

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# 3. Run Supabase migrations
npx supabase init
npx supabase migration new help_system
# Paste the SQL from this guide
npx supabase migration up

# 4. Install Playwright browsers
npx playwright install chromium

# 5. Create required directories
mkdir -p docs/screenshots docs/generated
```

### Development Workflow

```bash
# Start development server
npm run dev

# In another terminal, run documentation tests
npm run test:docs

# Generate documentation for specific feature
npx playwright test --grep="onboarding" --project=chromium-docs

# Open Playwright UI for interactive testing
npx playwright test --ui
```

### Converting Your Tests

1. **Import the documentation fixture** instead of default Playwright test:
```typescript
// Change this:
import { test, expect } from '@playwright/test';

// To this:
import { test, expect } from '../fixtures/documentation-fixture';
```

2. **Add documentation captures** at key points:
```typescript
test('your existing test', async ({ page, docs }) => {
  // Your existing test code...
  
  // Add documentation capture
  await docs.captureAnnotatedScreenshot('screenshot-name.png', {
    title: 'Screenshot Title',
    description: 'What this shows',
    annotations: [
      { type: 'arrow', target: '.element', text: 'Click here' }
    ]
  });
});
```

3. **Run with documentation flag**:
```bash
CAPTURE_DOCS=true npm test
```

### Production Deployment

```bash
# Build for production
npm run build

# Test production build locally
npm run start

# Deploy to Vercel
vercel --prod

# Run documentation generation in CI/CD
# (Automated via GitHub Actions)
```

## Package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "playwright test",
    "test:docs": "CAPTURE_DOCS=true playwright test --grep='Documentation'",
    "test:ui": "playwright test --ui",
    "generate:docs": "tsx scripts/generate-docs.ts",
    "capture:screenshots": "CAPTURE_DOCS=true UPLOAD_SCREENSHOTS=true playwright test --project=chromium-docs",
    "sync:supabase": "tsx scripts/sync-screenshots.ts",
    "help:dev": "concurrently \"npm run dev\" \"npm run test:docs --watch\""
  }
}
```

## Troubleshooting

### Common Issues and Solutions

1. **Syncfusion License Issues**
   - Ensure license key is in `.env.local`
   - Clear browser cache after updating license
   - Check license validity at https://www.syncfusion.com/account/manage-trials/licenses

2. **Supabase Connection Issues**
   - Verify all three Supabase keys are set correctly
   - Check Row Level Security policies
   - Ensure storage bucket 'help-media' exists and is public

3. **Playwright Screenshot Issues**
   - Run `npx playwright install` if browsers are missing
   - Check `CAPTURE_DOCS=true` is set
   - Verify app is running on correct port (3000)
   - Use `--headed` flag to debug visually

4. **GPT API Issues**
   - Check API key is valid
   - Monitor rate limits in OpenAI dashboard
   - Implement retry logic for transient failures

5. **Vercel Deployment Issues**
   - Ensure all environment variables are set in Vercel dashboard
   - Check build logs for missing dependencies
   - Verify Supabase can be accessed from Vercel servers

## Best Practices

1. **Documentation Tests**
   - Keep documentation tests separate from functional tests
   - Use descriptive file names for screenshots
   - Always blur sensitive data
   - Capture both success and error states

2. **Screenshot Annotations**
   - Use consistent colors (green for success, red for errors, blue for info)
   - Number steps sequentially
   - Keep annotation text concise
   - Position annotations to not obscure important content

3. **Performance**
   - Run documentation tests in parallel when possible
   - Cache generated content locally
   - Use Supabase connection pooling
   - Lazy load Syncfusion components

4. **Maintenance**
   - Review generated documentation weekly
   - Update test selectors when UI changes
   - Keep annotation styles consistent
   - Version control screenshot outputs

## Support Resources

- **Syncfusion Documentation**: https://ej2.syncfusion.com/react/documentation/
- **Syncfusion Support**: https://support.syncfusion.com/
- **Supabase Docs**: https://supabase.com/docs
- **Playwright Docs**: https://playwright.dev/docs/intro
- **OpenAI API Docs**: https://platform.openai.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Vercel Docs**: https://vercel.com/docs

## Summary

This implementation provides:

1. **Automated Documentation** - Screenshots captured during test runs
2. **AI-Enhanced Content** - GPT generates and enhances documentation
3. **Rich Editing** - Full Syncfusion component suite for content creation
4. **Seamless Integration** - Works with your existing Playwright tests
5. **Cloud Storage** - Supabase handles all media and content storage
6. **CI/CD Ready** - GitHub Actions automate the entire process
7. **Production Deployment** - Vercel hosting with automatic updates

The system requires minimal changes to your existing tests while providing comprehensive documentation capabilities. All screenshots are automatically annotated, stored, and made available in your help system editor.