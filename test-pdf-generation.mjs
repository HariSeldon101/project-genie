#!/usr/bin/env node

/**
 * Test PDF Generation
 * Tests the new PDF generation system
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000/api/pdf/generate';

// Test document content
const testDocument = {
  documentType: 'pid',
  content: {
    executiveSummary: 'This is a test Project Initiation Document to verify PDF generation is working correctly with the new Syncfusion and Puppeteer system.',
    projectBackground: 'The project aims to test the new PDF generation capabilities after migrating from @react-pdf/renderer to Syncfusion PDF Viewer with HTML-to-PDF conversion using Puppeteer.',
    projectDefinition: {
      objectives: [
        'Test PDF generation',
        'Verify formatting quality',
        'Ensure no blank pages',
        'Validate caching works'
      ],
      scope: {
        inScope: [
          'PDF generation for all document types',
          'Professional formatting',
          'Watermarking support',
          'Caching in Supabase Storage'
        ],
        outOfScope: [
          'Email delivery',
          'Batch processing',
          'Custom templates'
        ]
      },
      deliverables: [
        'Working PDF generation system',
        'Cached PDFs in storage',
        'Professional quality output'
      ]
    },
    projectPlan: {
      phases: [
        {
          name: 'Setup Phase',
          duration: '1 day',
          description: 'Install and configure Syncfusion',
          deliverables: ['Configured system']
        },
        {
          name: 'Implementation Phase',
          duration: '2 days',
          description: 'Implement formatters and generator',
          deliverables: ['HTML formatters', 'Puppeteer generator']
        },
        {
          name: 'Testing Phase',
          duration: '1 day',
          description: 'Test all document types',
          deliverables: ['Verified PDFs']
        }
      ],
      milestones: [
        {
          milestone: 'System Setup Complete',
          date: '2025-08-29',
          status: 'Completed'
        },
        {
          milestone: 'Formatters Implemented',
          date: '2025-08-29',
          status: 'Completed'
        },
        {
          milestone: 'Testing Complete',
          date: '2025-08-29',
          status: 'In Progress'
        }
      ]
    },
    riskManagement: {
      risks: [
        {
          risk: 'Puppeteer compatibility issues',
          probability: 'Low',
          impact: 'Medium',
          mitigation: 'Use stable Puppeteer version'
        },
        {
          risk: 'Storage bucket configuration',
          probability: 'Low',
          impact: 'Low',
          mitigation: 'Manual configuration via API'
        }
      ]
    }
  },
  projectName: 'PDF Migration Test',
  companyName: 'Project Genie',
  options: {
    whiteLabel: false,
    watermarkText: 'Project Genie',
    showDraft: false,
    pageNumbers: true,
    useCache: true
  }
};

async function testPDFGeneration() {
  console.log('🧪 Testing PDF Generation...\n');
  
  try {
    console.log('📤 Sending request to:', API_URL);
    console.log('📄 Document type:', testDocument.documentType);
    console.log('🏢 Project:', testDocument.projectName);
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In production, you'd need proper authentication
      },
      body: JSON.stringify(testDocument)
    });
    
    console.log('\n📥 Response status:', response.status);
    console.log('📊 Response headers:');
    console.log('  Content-Type:', response.headers.get('content-type'));
    console.log('  X-PDF-Cached:', response.headers.get('x-pdf-cached'));
    
    if (response.ok) {
      if (response.headers.get('content-type')?.includes('application/pdf')) {
        const buffer = await response.buffer();
        console.log('\n✅ PDF Generated Successfully!');
        console.log('📦 PDF size:', (buffer.length / 1024).toFixed(2), 'KB');
        
        // Save to test file
        const fs = await import('fs/promises');
        const filename = `test-pdf-${Date.now()}.pdf`;
        await fs.writeFile(filename, buffer);
        console.log('💾 Saved to:', filename);
        
        // Open the PDF
        const { exec } = await import('child_process');
        exec(`open ${filename}`);
        console.log('👁️  Opening PDF for review...');
        
      } else {
        const data = await response.json();
        console.log('\n✅ PDF URL Generated:', data.url);
        console.log('📊 Metadata:', data.metadata);
        console.log('📄 Pages:', data.pageCount);
        console.log('💾 Cached:', data.cached);
      }
    } else {
      const error = await response.json();
      console.error('\n❌ Error:', error);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\n⚠️  Make sure:');
    console.error('  1. Dev server is running on http://localhost:3000');
    console.error('  2. You are logged in to the application');
    console.error('  3. Supabase is configured correctly');
  }
}

// Run the test
console.log('🚀 PDF Generation Test Suite');
console.log('============================\n');
testPDFGeneration();