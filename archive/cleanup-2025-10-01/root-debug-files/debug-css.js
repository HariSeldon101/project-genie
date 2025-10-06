// Comprehensive CSS Debugging Script for Company Intelligence Page
// Run this in browser console at http://localhost:3001/company-intelligence

(() => {
  console.log('========================================');
  console.log('🔍 COMPANY INTELLIGENCE CSS DEBUG REPORT');
  console.log('========================================\n');

  // 1. CHECK CSS VARIABLES
  console.log('1️⃣ CSS VARIABLES CHECK:');
  console.log('------------------------');
  const checkCSSVariables = () => {
    const root = getComputedStyle(document.documentElement);
    const criticalVars = {
      // Core colors
      '--background': 'Background',
      '--foreground': 'Foreground',
      '--card': 'Card',
      '--card-foreground': 'Card Foreground',
      '--border': 'Border',
      '--primary': 'Primary',
      '--primary-foreground': 'Primary Foreground',
      '--secondary': 'Secondary',
      '--muted': 'Muted',
      '--accent': 'Accent',
      '--destructive': 'Destructive',
      '--ring': 'Ring',
      // Custom status colors
      '--color-success': 'Success',
      '--color-info': 'Info',
      '--color-warning': 'Warning',
      '--color-error': 'Error',
      // Gradients
      '--color-gradient-start': 'Gradient Start',
      '--color-gradient-mid': 'Gradient Mid',
      '--color-gradient-end': 'Gradient End'
    };

    let undefinedCount = 0;
    Object.entries(criticalVars).forEach(([varName, label]) => {
      const value = root.getPropertyValue(varName);
      if (!value || value.trim() === '') {
        console.log(`❌ ${label} (${varName}): UNDEFINED`);
        undefinedCount++;
      } else {
        console.log(`✅ ${label}: ${value}`);
      }
    });
    console.log(`\n📊 Summary: ${undefinedCount} undefined variables\n`);
    return undefinedCount === 0;
  };

  // 2. TEST UTILITY CLASSES
  console.log('2️⃣ UTILITY CLASSES TEST:');
  console.log('------------------------');
  const testUtilityClasses = () => {
    const testElement = document.createElement('div');
    testElement.style.width = '100px';
    testElement.style.height = '100px';
    document.body.appendChild(testElement);

    const tests = [
      // Shadows
      { class: 'shadow-sm', check: (s) => s.boxShadow !== 'none', type: 'Shadow' },
      { class: 'shadow', check: (s) => s.boxShadow !== 'none', type: 'Shadow' },
      { class: 'shadow-md', check: (s) => s.boxShadow !== 'none', type: 'Shadow' },
      { class: 'shadow-lg', check: (s) => s.boxShadow !== 'none', type: 'Shadow' },
      { class: 'shadow-xl', check: (s) => s.boxShadow !== 'none', type: 'Shadow' },
      { class: 'shadow-2xl', check: (s) => s.boxShadow !== 'none', type: 'Shadow' },
      // Colors
      { class: 'bg-card', check: (s) => s.backgroundColor !== 'rgba(0, 0, 0, 0)', type: 'Color' },
      { class: 'bg-primary', check: (s) => s.backgroundColor !== 'rgba(0, 0, 0, 0)', type: 'Color' },
      { class: 'bg-success', check: (s) => s.backgroundColor !== 'rgba(0, 0, 0, 0)', type: 'Color' },
      { class: 'bg-info', check: (s) => s.backgroundColor !== 'rgba(0, 0, 0, 0)', type: 'Color' },
      { class: 'text-primary', check: (s) => s.color !== 'rgb(0, 0, 0)', type: 'Color' },
      { class: 'border-border', check: (s) => s.borderColor !== 'rgb(0, 0, 0)', type: 'Border' },
      // Gradients
      { class: 'bg-gradient-to-r', check: (s) => s.backgroundImage !== 'none', type: 'Gradient' },
      { class: 'from-primary', check: (s) => true, type: 'Gradient' },
      { class: 'to-secondary', check: (s) => true, type: 'Gradient' }
    ];

    const results = { working: [], broken: [] };
    tests.forEach(test => {
      testElement.className = test.class;
      const styles = getComputedStyle(testElement);
      const works = test.check(styles);

      if (works) {
        console.log(`✅ ${test.class} (${test.type})`);
        results.working.push(test.class);
      } else {
        console.log(`❌ ${test.class} (${test.type}) - NOT WORKING`);
        results.broken.push(test.class);
      }
    });

    document.body.removeChild(testElement);
    console.log(`\n📊 Summary: ${results.working.length} working, ${results.broken.length} broken\n`);
    return results;
  };

  // 3. INSPECT WORKFLOW STEPS
  console.log('3️⃣ WORKFLOW STEPS INSPECTION:');
  console.log('-------------------------------');
  const inspectWorkflowSteps = () => {
    const steps = document.querySelectorAll('[class*="rounded-xl"]');
    if (steps.length === 0) {
      console.log('❌ No workflow steps found');
      return;
    }

    steps.forEach((step, index) => {
      const styles = getComputedStyle(step);
      const hasBackground = styles.backgroundColor !== 'rgba(0, 0, 0, 0)';
      const hasShadow = styles.boxShadow !== 'none';
      const hasBorder = styles.borderWidth !== '0px';

      console.log(`Step ${index + 1}:`, {
        background: hasBackground ? '✅' : '❌',
        shadow: hasShadow ? '✅' : '❌',
        border: hasBorder ? '✅' : '❌',
        actualBg: styles.backgroundColor,
        actualShadow: styles.boxShadow
      });
    });
  };

  // 4. INSPECT CARD COMPONENTS
  console.log('\n4️⃣ CARD COMPONENTS INSPECTION:');
  console.log('--------------------------------');
  const inspectCards = () => {
    const cards = document.querySelectorAll('[class*="rounded-lg"]');
    if (cards.length === 0) {
      console.log('❌ No card components found');
      return;
    }

    cards.forEach((card, index) => {
      const styles = getComputedStyle(card);
      console.log(`Card ${index + 1}:`, {
        background: styles.backgroundColor,
        border: styles.border,
        shadow: styles.boxShadow,
        borderRadius: styles.borderRadius
      });
    });
  };

  // 5. CHECK BUTTON STYLING
  console.log('\n5️⃣ BUTTON INSPECTION:');
  console.log('----------------------');
  const inspectButtons = () => {
    const buttons = document.querySelectorAll('button');
    buttons.forEach((btn, index) => {
      const styles = getComputedStyle(btn);
      const text = btn.textContent.trim().substring(0, 20);
      console.log(`Button "${text}":`, {
        background: styles.backgroundColor,
        color: styles.color,
        shadow: styles.boxShadow,
        padding: styles.padding,
        hover: btn.matches(':hover') ? 'Active' : 'Check manually'
      });
    });
  };

  // 6. CHECK TAILWIND PRESENCE
  console.log('\n6️⃣ TAILWIND CSS DETECTION:');
  console.log('---------------------------');
  const checkTailwindPresence = () => {
    const stylesheets = Array.from(document.styleSheets);
    let hasTailwind = false;
    let hasCustomUtilities = false;

    try {
      stylesheets.forEach(sheet => {
        if (sheet.href && sheet.href.includes('/_next/')) {
          const rules = Array.from(sheet.cssRules || []);
          rules.forEach(rule => {
            if (rule.selectorText) {
              if (rule.selectorText.includes('.bg-primary')) hasTailwind = true;
              if (rule.selectorText.includes('.bg-success')) hasCustomUtilities = true;
            }
          });
        }
      });
    } catch (e) {
      console.log('⚠️ Could not access all stylesheets (CORS)');
    }

    console.log(`Tailwind Base: ${hasTailwind ? '✅' : '❌'}`);
    console.log(`Custom Utilities: ${hasCustomUtilities ? '✅' : '❌'}`);

    // Alternative check
    const testDiv = document.createElement('div');
    testDiv.className = 'hidden';
    document.body.appendChild(testDiv);
    const hiddenStyles = getComputedStyle(testDiv);
    const tailwindWorks = hiddenStyles.display === 'none';
    document.body.removeChild(testDiv);
    console.log(`Tailwind Utilities Work: ${tailwindWorks ? '✅' : '❌'}`);
  };

  // 7. IDENTIFY MISSING STYLES
  console.log('\n7️⃣ MISSING STYLES ANALYSIS:');
  console.log('----------------------------');
  const identifyMissingStyles = () => {
    const issues = [];

    // Check for gradient backgrounds
    const gradientElements = document.querySelectorAll('[class*="gradient"]');
    if (gradientElements.length === 0) {
      issues.push('No gradient classes found in DOM');
    }

    // Check for shadow utilities
    const shadowElements = document.querySelectorAll('[class*="shadow"]');
    if (shadowElements.length === 0) {
      issues.push('No shadow classes found in DOM');
    }

    // Check main container background
    const main = document.querySelector('main');
    if (main) {
      const mainStyles = getComputedStyle(main);
      if (mainStyles.backgroundImage === 'none') {
        issues.push('Main container missing background gradient');
      }
    }

    if (issues.length > 0) {
      console.log('🔴 Issues found:');
      issues.forEach(issue => console.log(`  - ${issue}`));
    } else {
      console.log('✅ No obvious missing styles detected');
    }

    return issues;
  };

  // 8. CHECK COMPUTED STYLES FOR KEY ELEMENTS
  console.log('\n8️⃣ KEY ELEMENT COMPUTED STYLES:');
  console.log('---------------------------------');
  const checkKeyElements = () => {
    const selectors = {
      'Main Container': 'main',
      'Domain Input': 'input[placeholder*="example"]',
      'Analyze Button': 'button:has(.lucide-search)',
      'Workflow Container': '[class*="grid-cols"]',
      'Card Container': '[class*="rounded-lg"]'
    };

    Object.entries(selectors).forEach(([name, selector]) => {
      const element = document.querySelector(selector);
      if (element) {
        const styles = getComputedStyle(element);
        console.log(`\n${name}:`);
        console.log(`  Background: ${styles.backgroundColor}`);
        console.log(`  Border: ${styles.border}`);
        console.log(`  Shadow: ${styles.boxShadow}`);
        console.log(`  Classes: ${element.className}`);
      } else {
        console.log(`\n${name}: ❌ Not found`);
      }
    });
  };

  // RUN ALL CHECKS
  const allVarsOk = checkCSSVariables();
  const utilityResults = testUtilityClasses();
  inspectWorkflowSteps();
  inspectCards();
  inspectButtons();
  checkTailwindPresence();
  const issues = identifyMissingStyles();
  checkKeyElements();

  // FINAL DIAGNOSIS
  console.log('\n========================================');
  console.log('📋 FINAL DIAGNOSIS:');
  console.log('========================================');

  const diagnosis = [];
  if (!allVarsOk) diagnosis.push('CSS Variables not properly defined');
  if (utilityResults.broken.length > 0) diagnosis.push(`${utilityResults.broken.length} utility classes broken`);
  if (issues.length > 0) diagnosis.push('Missing expected styles in DOM');

  if (diagnosis.length === 0) {
    console.log('✅ All CSS systems appear functional');
  } else {
    console.log('🔴 ISSUES DETECTED:');
    diagnosis.forEach(d => console.log(`  - ${d}`));
    console.log('\n🔧 RECOMMENDED FIXES:');
    console.log('  1. Check Tailwind v4 configuration');
    console.log('  2. Verify PostCSS is processing correctly');
    console.log('  3. Ensure globals.css is loaded properly');
    console.log('  4. Check for CSS-in-JS conflicts');
  }

  console.log('\n========================================');
  console.log('Debug report complete. Check above for issues.');
  console.log('========================================');

  return { allVarsOk, utilityResults, issues };
})();