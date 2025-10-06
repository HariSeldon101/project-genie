// Verify Inline Styles Fix - Company Intelligence Page
// Run this in browser console at http://localhost:3001/company-intelligence

(() => {
  console.log('%c🎨 INLINE STYLES FIX VERIFICATION', 'font-size: 20px; font-weight: bold; color: #10B981');
  console.log('=' .repeat(60));

  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  // 1. Check Workflow Steps
  console.log('\n1️⃣ WORKFLOW STEPS CHECK:');
  const workflowSteps = document.querySelectorAll('[class*="rounded-full"][class*="p-3"]');

  if (workflowSteps.length > 0) {
    console.log(`Found ${workflowSteps.length} workflow steps\n`);

    workflowSteps.forEach((step, i) => {
      const styles = getComputedStyle(step);
      const inlineStyles = step.style;

      // Check for inline styles
      const hasInlineBackground = !!inlineStyles.backgroundColor;
      const hasInlineColor = !!inlineStyles.color;
      const hasInlineBoxShadow = !!inlineStyles.boxShadow;

      // Get actual computed values
      const bgColor = styles.backgroundColor;
      const textColor = styles.color;
      const boxShadow = styles.boxShadow;

      // Check if colors match expected values
      const isBlue = bgColor.includes('59, 130, 246') || bgColor === 'rgb(59, 130, 246)';
      const isGreen = bgColor.includes('16, 185, 129') || bgColor === 'rgb(16, 185, 129)';
      const isRed = bgColor.includes('239, 68, 68') || bgColor === 'rgb(239, 68, 68)';
      const isGray = bgColor.includes('229, 231, 235') || bgColor === 'rgb(229, 231, 235)';

      const hasProperColor = isBlue || isGreen || isRed || isGray;
      const hasProperShadow = boxShadow !== 'none';

      console.log(`Step ${i + 1}:`);
      console.log(`  Inline styles: ${hasInlineBackground ? '✅' : '❌'}`);
      console.log(`  Background: ${bgColor.substring(0, 30)}... ${hasProperColor ? '✅' : '⚠️'}`);
      console.log(`  Shadow: ${hasProperShadow ? '✅' : '❌'}`);

      if (hasInlineBackground && hasProperColor && hasProperShadow) {
        results.passed.push(`Step ${i + 1}`);
      } else if (hasProperColor) {
        results.warnings.push(`Step ${i + 1} - partial styling`);
      } else {
        results.failed.push(`Step ${i + 1}`);
      }
    });
  } else {
    console.log('❌ No workflow steps found');
    results.failed.push('Workflow steps');
  }

  // 2. Check Step Labels
  console.log('\n2️⃣ STEP LABELS CHECK:');
  const stepLabels = document.querySelectorAll('.text-sm.font-medium.whitespace-nowrap');

  if (stepLabels.length > 0) {
    console.log(`Found ${stepLabels.length} step labels\n`);

    let coloredLabels = 0;
    stepLabels.forEach((label, i) => {
      const styles = getComputedStyle(label);
      const color = styles.color;

      // Check if it has a non-default color
      const hasColor =
        color.includes('59, 130, 246') ||  // Blue
        color.includes('16, 185, 129') ||  // Green
        color.includes('239, 68, 68') ||   // Red
        color.includes('107, 114, 128');   // Gray

      if (hasColor) {
        coloredLabels++;
      }
    });

    console.log(`  Colored labels: ${coloredLabels}/${stepLabels.length} ${coloredLabels > 0 ? '✅' : '❌'}`);

    if (coloredLabels > 0) {
      results.passed.push('Step labels');
    } else {
      results.failed.push('Step labels');
    }
  }

  // 3. Check Cards
  console.log('\n3️⃣ CARD CHECK:');
  const cards = document.querySelectorAll('[data-slot="card"]');

  if (cards.length > 0) {
    console.log(`Found ${cards.length} card(s)\n`);

    cards.forEach((card, i) => {
      const styles = getComputedStyle(card);
      const inlineStyles = card.style;

      const hasInlineShadow = !!inlineStyles.boxShadow;
      const hasShadow = styles.boxShadow !== 'none';

      console.log(`Card ${i + 1}:`);
      console.log(`  Inline shadow: ${hasInlineShadow ? '✅' : '❌'}`);
      console.log(`  Computed shadow: ${hasShadow ? '✅' : '❌'}`);

      if (hasShadow) {
        results.passed.push(`Card ${i + 1}`);
      } else {
        results.failed.push(`Card ${i + 1}`);
      }
    });
  }

  // 4. Check Analyze Button
  console.log('\n4️⃣ ANALYZE BUTTON CHECK:');
  const analyzeButton = Array.from(document.querySelectorAll('button'))
    .find(btn => btn.textContent.includes('Analyze'));

  if (analyzeButton) {
    const styles = getComputedStyle(analyzeButton);
    const inlineStyles = analyzeButton.style;

    const hasInlineBackground = !!inlineStyles.backgroundColor;
    const bgColor = styles.backgroundColor;
    const hasProperBg = bgColor.includes('59, 130, 246') || bgColor.includes('229, 231, 235');

    console.log(`  Inline background: ${hasInlineBackground ? '✅' : '❌'}`);
    console.log(`  Background color: ${bgColor.substring(0, 30)}... ${hasProperBg ? '✅' : '⚠️'}`);

    if (hasInlineBackground && hasProperBg) {
      results.passed.push('Analyze button');
    } else if (hasProperBg) {
      results.warnings.push('Analyze button - partial');
    } else {
      results.failed.push('Analyze button');
    }
  } else {
    console.log('  Button not found ❌');
    results.failed.push('Analyze button');
  }

  // 5. Check Animation
  console.log('\n5️⃣ ANIMATION CHECK:');
  const animatedElements = Array.from(document.querySelectorAll('*'))
    .filter(el => {
      const animation = getComputedStyle(el).animation;
      return animation && animation.includes('pulse');
    });

  console.log(`  Elements with pulse animation: ${animatedElements.length} ${animatedElements.length > 0 ? '✅' : '⚠️'}`);

  if (animatedElements.length > 0) {
    results.passed.push('Animations');
  } else {
    results.warnings.push('No animations detected');
  }

  // FINAL REPORT
  console.log('\n' + '=' .repeat(60));
  console.log('%c📊 FINAL REPORT', 'font-size: 18px; font-weight: bold; color: #3B82F6');
  console.log('=' .repeat(60));

  console.log(`\n✅ PASSED (${results.passed.length}):`);
  results.passed.forEach(item => console.log(`  • ${item}`));

  if (results.warnings.length > 0) {
    console.log(`\n⚠️ WARNINGS (${results.warnings.length}):`);
    results.warnings.forEach(item => console.log(`  • ${item}`));
  }

  if (results.failed.length > 0) {
    console.log(`\n❌ FAILED (${results.failed.length}):`);
    results.failed.forEach(item => console.log(`  • ${item}`));
  }

  // Overall Assessment
  const total = results.passed.length + results.failed.length;
  const successRate = ((results.passed.length / total) * 100).toFixed(0);

  console.log('\n🎯 OVERALL ASSESSMENT:');
  if (results.failed.length === 0) {
    console.log('🎉 ALL INLINE STYLES SUCCESSFULLY APPLIED!');
    console.log('The Company Intelligence page should now display correctly.');
  } else if (successRate >= 70) {
    console.log('✅ MOSTLY FIXED - Inline styles are working');
    console.log(`Success rate: ${successRate}%`);
  } else {
    console.log('❌ ISSUES REMAIN');
    console.log(`Only ${successRate}% of elements properly styled`);
  }

  console.log('\n🔍 VISUAL CHECKLIST:');
  console.log('  [ ] Workflow steps have colored backgrounds (blue/green/gray)');
  console.log('  [ ] Active step is pulsing');
  console.log('  [ ] Cards have visible shadows');
  console.log('  [ ] Analyze button is blue when enabled');
  console.log('  [ ] Step labels match their circle colors');

  return {
    passed: results.passed.length,
    warnings: results.warnings.length,
    failed: results.failed.length,
    successRate
  };
})();