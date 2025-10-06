// Final CSS Verification - Run after fixes
// Execute in browser console at http://localhost:3000/company-intelligence

(() => {
  console.log('%c🎯 FINAL CSS VERIFICATION', 'font-size: 20px; font-weight: bold; color: #10B981');
  console.log('=' .repeat(60));

  const results = {
    shadows: { passed: 0, failed: 0 },
    colors: { passed: 0, failed: 0 },
    elements: { passed: 0, failed: 0 }
  };

  // 1. Test Shadow Utilities
  console.log('\n📦 SHADOW UTILITIES:');
  ['shadow-sm', 'shadow', 'shadow-md', 'shadow-lg', 'shadow-xl'].forEach(cls => {
    const test = document.createElement('div');
    test.className = cls;
    document.body.appendChild(test);
    const shadow = getComputedStyle(test).boxShadow;
    const works = shadow !== 'none';

    if (works) {
      console.log(`✅ .${cls} working`);
      results.shadows.passed++;
    } else {
      console.log(`❌ .${cls} NOT working`);
      results.shadows.failed++;
    }

    document.body.removeChild(test);
  });

  // 2. Test Color Utilities
  console.log('\n🎨 COLOR UTILITIES:');
  const colorTests = [
    'bg-success', 'bg-info', 'bg-warning', 'bg-error',
    'bg-muted', 'bg-card', 'bg-primary'
  ];

  colorTests.forEach(cls => {
    const test = document.createElement('div');
    test.className = cls;
    document.body.appendChild(test);
    const bg = getComputedStyle(test).backgroundColor;
    const works = bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent';

    if (works) {
      console.log(`✅ .${cls} = ${bg}`);
      results.colors.passed++;
    } else {
      console.log(`❌ .${cls} NOT working`);
      results.colors.failed++;
    }

    document.body.removeChild(test);
  });

  // 3. Check Actual Page Elements
  console.log('\n🎯 PAGE ELEMENTS:');

  // Workflow steps
  const steps = document.querySelectorAll('[class*="rounded-full"][class*="p-3"]');
  if (steps.length > 0) {
    console.log(`\nWorkflow Steps (${steps.length}):`)
    steps.forEach((step, i) => {
      const styles = getComputedStyle(step);
      const hasBackground = styles.backgroundColor !== 'rgba(0, 0, 0, 0)';
      const hasShadow = styles.boxShadow !== 'none';

      if (hasBackground || hasShadow) {
        console.log(`  ✅ Step ${i + 1}: Has styling`);
        results.elements.passed++;
      } else {
        console.log(`  ❌ Step ${i + 1}: No styling`);
        results.elements.failed++;
      }
    });
  }

  // Cards
  const cards = document.querySelectorAll('[data-slot="card"]');
  if (cards.length > 0) {
    console.log(`\nCards (${cards.length}):`)
    cards.forEach((card, i) => {
      const styles = getComputedStyle(card);
      const hasShadow = styles.boxShadow !== 'none';
      const hasBackground = styles.backgroundColor !== 'rgba(0, 0, 0, 0)';

      if (hasShadow && hasBackground) {
        console.log(`  ✅ Card ${i + 1}: Properly styled`);
        results.elements.passed++;
      } else {
        console.log(`  ❌ Card ${i + 1}: Missing ${!hasShadow ? 'shadow' : 'background'}`);
        results.elements.failed++;
      }
    });
  }

  // 4. Final Report
  console.log('\n' + '=' .repeat(60));
  console.log('%c📊 RESULTS SUMMARY', 'font-size: 18px; font-weight: bold; color: #3B82F6');

  const totalPassed = results.shadows.passed + results.colors.passed + results.elements.passed;
  const totalFailed = results.shadows.failed + results.colors.failed + results.elements.failed;
  const successRate = ((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1);

  console.log(`\n✅ Passed: ${totalPassed}`);
  console.log(`❌ Failed: ${totalFailed}`);
  console.log(`📈 Success Rate: ${successRate}%`);

  if (totalFailed === 0) {
    console.log('\n🎉 %cALL CSS FIXES SUCCESSFULLY APPLIED!', 'font-size: 16px; font-weight: bold; color: #10B981');
    console.log('The UI should now display correctly with:');
    console.log('  • Cards with shadows');
    console.log('  • Colored workflow steps');
    console.log('  • Proper backgrounds');
    console.log('  • Working hover effects');
  } else if (successRate >= 80) {
    console.log('\n⚠️ %cMOSTLY WORKING', 'font-size: 16px; font-weight: bold; color: #F59E0B');
    console.log('Most CSS is working but some issues remain.');
    console.log('Try: Hard refresh (Cmd+Shift+R)');
  } else {
    console.log('\n❌ %cCSS STILL BROKEN', 'font-size: 16px; font-weight: bold; color: #EF4444');
    console.log('The fixes have not been applied properly.');
    console.log('Recommendations:');
    console.log('  1. Check if globals.css is being loaded');
    console.log('  2. Clear browser cache');
    console.log('  3. Check for CSS compilation errors');
    console.log('  4. Run debug-css-layers.js for detailed analysis');
  }

  console.log('\n💡 Quick Visual Check:');
  console.log('  • Workflow steps should have colored backgrounds');
  console.log('  • Cards should have visible shadows');
  console.log('  • Buttons should have hover effects');

  return { totalPassed, totalFailed, successRate };
})();