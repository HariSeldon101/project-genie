// CSS Layers Diagnostic Script - Find why utilities aren't working
// Run in browser console at http://localhost:3000/company-intelligence

(() => {
  console.log('%c🔍 CSS LAYERS DIAGNOSTIC', 'font-size: 18px; font-weight: bold; color: #3B82F6');
  console.log('=' .repeat(50));

  const diagnostics = {
    layers: [],
    utilities: {},
    conflicts: [],
    recommendations: []
  };

  // 1. CHECK STYLESHEETS AND LAYERS
  console.log('\n📋 CHECKING STYLESHEETS...');
  const sheets = Array.from(document.styleSheets);
  console.log(`Found ${sheets.length} stylesheets`);

  sheets.forEach((sheet, i) => {
    try {
      const rules = Array.from(sheet.cssRules || []);
      const layerRules = rules.filter(r => r.cssText && r.cssText.includes('@layer'));

      if (layerRules.length > 0) {
        console.log(`\nStylesheet ${i}: ${sheet.href || 'inline'}`);
        layerRules.forEach(rule => {
          const preview = rule.cssText.substring(0, 100);
          console.log(`  Layer found: ${preview}...`);
          diagnostics.layers.push({
            sheet: i,
            rule: preview
          });
        });
      }

      // Check for our specific utility classes
      const utilityTests = ['.shadow-lg', '.bg-success', '.bg-gradient-to-r', '.bg-card', '.bg-muted'];
      utilityTests.forEach(selector => {
        const found = rules.some(r => r.selectorText === selector);
        if (found) {
          console.log(`  ✅ Found utility: ${selector}`);
          diagnostics.utilities[selector] = 'defined';
        }
      });
    } catch (e) {
      if (!sheet.href?.includes('fonts.googleapis')) {
        console.log(`  ⚠️ Cannot access sheet ${i}: ${e.message}`);
      }
    }
  });

  // 2. TEST UTILITY APPLICATION
  console.log('\n🧪 TESTING UTILITY APPLICATION...');
  const testUtilities = [
    { class: 'shadow-lg', property: 'boxShadow', expected: 'none' },
    { class: 'bg-success', property: 'backgroundColor', expected: 'rgba(0, 0, 0, 0)' },
    { class: 'bg-card', property: 'backgroundColor', expected: 'rgba(0, 0, 0, 0)' },
    { class: 'bg-muted', property: 'backgroundColor', expected: 'rgba(0, 0, 0, 0)' },
    { class: 'text-primary', property: 'color', expected: 'rgb(0, 0, 0)' },
    { class: 'bg-gradient-to-r', property: 'backgroundImage', expected: 'none' }
  ];

  const testContainer = document.createElement('div');
  testContainer.style.position = 'absolute';
  testContainer.style.left = '-9999px';
  document.body.appendChild(testContainer);

  testUtilities.forEach(test => {
    const el = document.createElement('div');
    el.className = test.class;
    testContainer.appendChild(el);
    const computed = getComputedStyle(el);
    const value = computed[test.property];
    const works = value !== test.expected;

    console.log(`${works ? '✅' : '❌'} .${test.class}: ${test.property} = ${value}`);

    if (!works) {
      diagnostics.conflicts.push({
        class: test.class,
        issue: `Not applying - ${test.property} is default value`
      });
    }

    testContainer.removeChild(el);
  });

  document.body.removeChild(testContainer);

  // 3. CHECK CSS VARIABLES
  console.log('\n🔢 CHECKING CSS VARIABLES...');
  const root = getComputedStyle(document.documentElement);
  const criticalVars = [
    '--color-success',
    '--color-info',
    '--color-warning',
    '--color-error',
    '--card',
    '--muted',
    '--primary',
    '--border'
  ];

  let missingVars = 0;
  criticalVars.forEach(varName => {
    const value = root.getPropertyValue(varName);
    if (!value || value.trim() === '') {
      console.log(`❌ ${varName}: UNDEFINED`);
      missingVars++;
      diagnostics.conflicts.push({
        variable: varName,
        issue: 'CSS variable not defined'
      });
    } else {
      console.log(`✅ ${varName}: ${value}`);
    }
  });

  // 4. CHECK ACTUAL ELEMENTS ON PAGE
  console.log('\n🎯 CHECKING PAGE ELEMENTS...');

  // Check workflow steps
  const workflowSteps = document.querySelectorAll('[class*="rounded-full"][class*="p-3"]');
  if (workflowSteps.length > 0) {
    console.log(`\nWorkflow Steps (${workflowSteps.length} found):`);
    workflowSteps.forEach((step, i) => {
      const computed = getComputedStyle(step);
      const bg = computed.backgroundColor;
      const shadow = computed.boxShadow;
      const hasStyles = bg !== 'rgba(0, 0, 0, 0)' && shadow !== 'none';

      console.log(`  Step ${i + 1}: ${hasStyles ? '✅' : '❌'} BG: ${bg.substring(0, 20)}... Shadow: ${shadow !== 'none'}`);

      if (!hasStyles) {
        // Check what classes are applied
        console.log(`    Classes: ${step.className}`);
        diagnostics.conflicts.push({
          element: `Workflow Step ${i + 1}`,
          issue: 'Missing background or shadow',
          classes: step.className
        });
      }
    });
  }

  // Check cards
  const cards = document.querySelectorAll('[data-slot="card"], .max-w-2xl');
  if (cards.length > 0) {
    console.log(`\nCards (${cards.length} found):`);
    cards.forEach((card, i) => {
      const computed = getComputedStyle(card);
      const shadow = computed.boxShadow;
      const hasShadow = shadow !== 'none';

      console.log(`  Card ${i + 1}: ${hasShadow ? '✅' : '❌'} Shadow: ${shadow}`);

      if (!hasShadow) {
        console.log(`    Classes: ${card.className}`);
        diagnostics.conflicts.push({
          element: `Card ${i + 1}`,
          issue: 'Missing shadow',
          classes: card.className
        });
      }
    });
  }

  // 5. CHECK FOR SPECIFICITY CONFLICTS
  console.log('\n⚖️ CHECKING SPECIFICITY...');

  // Create test element with multiple classes
  const specTest = document.createElement('div');
  specTest.className = 'shadow-lg bg-card';
  document.body.appendChild(specTest);

  // Get all matching rules
  const matchedRules = [];
  sheets.forEach(sheet => {
    try {
      const rules = Array.from(sheet.cssRules || []);
      rules.forEach(rule => {
        if (rule.selectorText && specTest.matches(rule.selectorText)) {
          matchedRules.push({
            selector: rule.selectorText,
            specificity: calculateSpecificity(rule.selectorText),
            styles: rule.style.cssText
          });
        }
      });
    } catch (e) {}
  });

  if (matchedRules.length > 0) {
    console.log('Matched rules for .shadow-lg.bg-card:');
    matchedRules.sort((a, b) => b.specificity - a.specificity);
    matchedRules.forEach(r => {
      console.log(`  ${r.selector} (specificity: ${r.specificity})`);
    });
  }

  document.body.removeChild(specTest);

  // 6. GENERATE RECOMMENDATIONS
  console.log('\n💡 RECOMMENDATIONS:');

  if (diagnostics.conflicts.length > 0) {
    if (diagnostics.conflicts.some(c => c.issue.includes('Not applying'))) {
      console.log('❗ Utilities are defined but not applying. Possible causes:');
      console.log('  1. CSS not being processed by PostCSS');
      console.log('  2. Layer order issues');
      console.log('  3. Missing Tailwind base styles');
      diagnostics.recommendations.push('Check PostCSS configuration');
      diagnostics.recommendations.push('Ensure Tailwind base styles are loaded');
    }

    if (missingVars > 0) {
      console.log('❗ CSS variables missing. Check:');
      console.log('  1. Variables are defined in :root or .dark');
      console.log('  2. @theme directive is processed');
      diagnostics.recommendations.push('Verify CSS variable definitions');
    }
  }

  // 7. FINAL DIAGNOSIS
  console.log('\n' + '='.repeat(50));
  console.log('%c📊 DIAGNOSIS SUMMARY', 'font-size: 16px; font-weight: bold; color: #10B981');

  const issueCount = diagnostics.conflicts.length;
  if (issueCount === 0) {
    console.log('✅ No CSS issues detected');
  } else {
    console.log(`❌ Found ${issueCount} issues:`);
    diagnostics.conflicts.slice(0, 5).forEach(c => {
      console.log(`  • ${c.element || c.class || c.variable}: ${c.issue}`);
    });
    if (issueCount > 5) {
      console.log(`  ... and ${issueCount - 5} more`);
    }
  }

  // 8. PROPOSED FIX
  console.log('\n🔧 PROPOSED FIX:');
  console.log('Add this to your globals.css to force styles with !important:');
  console.log(`
/* FORCE FIX - Add to end of globals.css */
.shadow-lg {
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1) !important;
}
.bg-success {
  background-color: oklch(0.648 0.190 142.495) !important;
}
.bg-info {
  background-color: oklch(0.577 0.191 255.507) !important;
}
.bg-muted {
  background-color: oklch(0.968 0.007 247.896) !important;
}
.bg-card {
  background-color: oklch(1 0 0) !important;
}
.dark .bg-card {
  background-color: oklch(0.208 0.042 265.755) !important;
}
  `);

  return diagnostics;

  // Helper function
  function calculateSpecificity(selector) {
    // Simplified specificity calculation
    const ids = (selector.match(/#/g) || []).length;
    const classes = (selector.match(/\./g) || []).length;
    const elements = (selector.match(/^[a-z]+/gi) || []).length;
    return ids * 100 + classes * 10 + elements;
  }
})();