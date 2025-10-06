// CSS Fixes Verification Script
// Run this in browser console at http://localhost:3000/company-intelligence
// This script verifies that all CSS fixes have been applied successfully

(() => {
  console.log('========================================');
  console.log('✨ CSS FIXES VERIFICATION');
  console.log('========================================\n');

  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  // Test 1: Shadow Utilities
  console.log('1️⃣ Testing Shadow Utilities:');
  const shadowTests = ['shadow-sm', 'shadow', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl'];
  shadowTests.forEach(cls => {
    const test = document.createElement('div');
    test.className = cls;
    document.body.appendChild(test);
    const shadow = getComputedStyle(test).boxShadow;
    const hasShadow = shadow !== 'none';
    if (hasShadow) {
      console.log(`✅ .${cls} = ${shadow.substring(0, 40)}...`);
      results.passed.push(`Shadow: ${cls}`);
    } else {
      console.log(`❌ .${cls} = No shadow!`);
      results.failed.push(`Shadow: ${cls}`);
    }
    document.body.removeChild(test);
  });

  // Test 2: Status Color Utilities
  console.log('\n2️⃣ Testing Status Colors:');
  const colorTests = [
    { class: 'bg-success', prop: 'backgroundColor' },
    { class: 'bg-info', prop: 'backgroundColor' },
    { class: 'bg-warning', prop: 'backgroundColor' },
    { class: 'bg-error', prop: 'backgroundColor' },
    { class: 'bg-muted', prop: 'backgroundColor' },
    { class: 'text-success', prop: 'color' },
    { class: 'text-info', prop: 'color' }
  ];

  colorTests.forEach(({ class: cls, prop }) => {
    const test = document.createElement('div');
    test.className = cls;
    document.body.appendChild(test);
    const value = getComputedStyle(test)[prop];
    const hasColor = value !== 'rgba(0, 0, 0, 0)' && value !== 'rgb(0, 0, 0)';
    if (hasColor) {
      console.log(`✅ .${cls} = ${value}`);
      results.passed.push(`Color: ${cls}`);
    } else {
      console.log(`❌ .${cls} = No color!`);
      results.failed.push(`Color: ${cls}`);
    }
    document.body.removeChild(test);
  });

  // Test 3: Gradient Utilities
  console.log('\n3️⃣ Testing Gradients:');
  const gradientTest = document.createElement('div');
  gradientTest.className = 'bg-gradient-to-r from-primary to-secondary';
  document.body.appendChild(gradientTest);
  const bgImage = getComputedStyle(gradientTest).backgroundImage;
  const hasGradient = bgImage.includes('gradient');
  if (hasGradient) {
    console.log(`✅ Gradients working: ${bgImage.substring(0, 50)}...`);
    results.passed.push('Gradients');
  } else {
    console.log(`❌ Gradients NOT working`);
    results.failed.push('Gradients');
  }
  document.body.removeChild(gradientTest);

  // Test 4: Workflow Step Inspection
  console.log('\n4️⃣ Inspecting Workflow Steps:');
  const workflowSteps = document.querySelectorAll('[class*="rounded-full"][class*="p-3"]');
  if (workflowSteps.length > 0) {
    console.log(`Found ${workflowSteps.length} workflow steps`);
    workflowSteps.forEach((step, i) => {
      const styles = getComputedStyle(step);
      const bg = styles.backgroundColor;
      const shadow = styles.boxShadow;
      const hasStyle = bg !== 'rgba(0, 0, 0, 0)';
      if (hasStyle) {
        console.log(`  Step ${i + 1}: ✅ Background: ${bg.substring(0, 30)}... Shadow: ${shadow !== 'none' ? 'Yes' : 'No'}`);
        results.passed.push(`Workflow Step ${i + 1}`);
      } else {
        console.log(`  Step ${i + 1}: ❌ No background color`);
        results.failed.push(`Workflow Step ${i + 1}`);
      }
    });
  } else {
    console.log('⚠️ No workflow steps found');
    results.warnings.push('No workflow steps found');
  }

  // Test 5: Card Components
  console.log('\n5️⃣ Inspecting Cards:');
  const cards = document.querySelectorAll('[data-slot="card"], [class*="rounded-lg"][class*="border"]');
  if (cards.length > 0) {
    console.log(`Found ${cards.length} cards`);
    cards.forEach((card, i) => {
      const styles = getComputedStyle(card);
      const hasShadow = styles.boxShadow !== 'none';
      const hasBorder = styles.borderWidth !== '0px';
      const hasBackground = styles.backgroundColor !== 'rgba(0, 0, 0, 0)';

      const cardOk = hasShadow && hasBorder && hasBackground;
      if (cardOk) {
        console.log(`  Card ${i + 1}: ✅ All styles applied`);
        results.passed.push(`Card ${i + 1}`);
      } else {
        console.log(`  Card ${i + 1}: ⚠️ Shadow: ${hasShadow}, Border: ${hasBorder}, BG: ${hasBackground}`);
        results.warnings.push(`Card ${i + 1} incomplete styles`);
      }
    });
  } else {
    console.log('⚠️ No cards found');
    results.warnings.push('No cards found');
  }

  // Test 6: Buttons
  console.log('\n6️⃣ Inspecting Buttons:');
  const buttons = document.querySelectorAll('button');
  let buttonIssues = 0;
  buttons.forEach((btn, i) => {
    const styles = getComputedStyle(btn);
    const hasShadow = styles.boxShadow !== 'none';
    const hasBackground = styles.backgroundColor !== 'rgba(0, 0, 0, 0)';

    if (!hasShadow || !hasBackground) {
      buttonIssues++;
      console.log(`  Button "${btn.textContent.trim().substring(0, 20)}": ⚠️ Missing ${!hasShadow ? 'shadow' : 'background'}`);
    }
  });

  if (buttonIssues === 0) {
    console.log('  ✅ All buttons properly styled');
    results.passed.push('All buttons');
  } else {
    console.log(`  ⚠️ ${buttonIssues} buttons with issues`);
    results.warnings.push(`${buttonIssues} button issues`);
  }

  // Test 7: Transitions
  console.log('\n7️⃣ Testing Transitions:');
  const transitionTest = document.createElement('div');
  transitionTest.className = 'transition-all duration-300';
  document.body.appendChild(transitionTest);
  const transition = getComputedStyle(transitionTest).transition;
  const hasTransition = transition && !transition.includes('all 0s');
  if (hasTransition) {
    console.log(`✅ Transitions working: ${transition}`);
    results.passed.push('Transitions');
  } else {
    console.log(`❌ Transitions NOT working`);
    results.failed.push('Transitions');
  }
  document.body.removeChild(transitionTest);

  // Final Report
  console.log('\n========================================');
  console.log('📊 FINAL REPORT:');
  console.log('========================================');

  console.log(`\n✅ PASSED (${results.passed.length}):`);
  results.passed.forEach(item => console.log(`  • ${item}`));

  if (results.failed.length > 0) {
    console.log(`\n❌ FAILED (${results.failed.length}):`);
    results.failed.forEach(item => console.log(`  • ${item}`));
  }

  if (results.warnings.length > 0) {
    console.log(`\n⚠️ WARNINGS (${results.warnings.length}):`);
    results.warnings.forEach(item => console.log(`  • ${item}`));
  }

  // Overall Assessment
  console.log('\n🎯 OVERALL ASSESSMENT:');
  const totalTests = results.passed.length + results.failed.length;
  const passRate = (results.passed.length / totalTests * 100).toFixed(1);

  if (results.failed.length === 0) {
    console.log('🎉 ALL CSS FIXES SUCCESSFULLY APPLIED!');
    console.log(`✅ Pass rate: 100% (${results.passed.length}/${totalTests})`);
  } else if (results.failed.length <= 2) {
    console.log('⚠️ MOSTLY FIXED - Minor issues remain');
    console.log(`📊 Pass rate: ${passRate}% (${results.passed.length}/${totalTests})`);
  } else {
    console.log('❌ SIGNIFICANT ISSUES REMAIN');
    console.log(`📊 Pass rate: ${passRate}% (${results.passed.length}/${totalTests})`);
    console.log('Run debug-css.js for detailed analysis');
  }

  console.log('\n💡 Next Steps:');
  if (results.failed.length === 0) {
    console.log('1. Visual inspection for aesthetic improvements');
    console.log('2. Test responsive design at different breakpoints');
    console.log('3. Check dark mode if applicable');
  } else {
    console.log('1. Check browser console for CSS errors');
    console.log('2. Verify CSS file is loaded (Network tab)');
    console.log('3. Clear browser cache and hard refresh');
    console.log('4. Check for CSS specificity conflicts');
  }

  console.log('\n========================================');

  return results;
})();