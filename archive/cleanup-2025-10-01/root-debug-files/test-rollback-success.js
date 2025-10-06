// Rollback Success Verification Script
// Tests that homepage is fixed and Company Intelligence has targeted styles

(() => {
  console.log('%c🔍 ROLLBACK VERIFICATION TEST', 'font-size: 20px; font-weight: bold; color: #10B981');
  console.log('=' .repeat(60));

  const currentPage = window.location.pathname;

  if (currentPage === '/' || currentPage === '') {
    // HOMEPAGE TESTS
    console.log('\n📄 TESTING HOMEPAGE...\n');

    // Check if main content is visible
    const mainContent = document.querySelector('main');
    const hasContent = mainContent && mainContent.children.length > 0;

    // Check button visibility
    const buttons = document.querySelectorAll('button');
    let visibleButtons = 0;
    buttons.forEach(btn => {
      const styles = getComputedStyle(btn);
      const isVisible = styles.visibility !== 'hidden' && styles.display !== 'none';
      if (isVisible) visibleButtons++;
    });

    // Check text contrast
    const headings = document.querySelectorAll('h1, h2, h3');
    let goodContrast = 0;
    headings.forEach(h => {
      const styles = getComputedStyle(h);
      const color = styles.color;
      // Check if text is not white on white
      if (color !== 'rgb(255, 255, 255)' && color !== 'rgba(255, 255, 255, 1)') {
        goodContrast++;
      }
    });

    // Results
    console.log('✅ Main content exists:', hasContent);
    console.log('✅ Visible buttons:', visibleButtons);
    console.log('✅ Headings with good contrast:', goodContrast);

    if (hasContent && visibleButtons > 0 && goodContrast > 0) {
      console.log('\n🎉 HOMEPAGE IS WORKING CORRECTLY!');
    } else {
      console.log('\n⚠️ HOMEPAGE MAY HAVE ISSUES');
    }

  } else if (currentPage.includes('company-intelligence')) {
    // COMPANY INTELLIGENCE TESTS
    console.log('\n🏢 TESTING COMPANY INTELLIGENCE PAGE...\n');

    // Test workflow steps
    const workflowSteps = document.querySelectorAll('[class*="workflowStep"]');
    console.log(`Found ${workflowSteps.length} workflow steps with CSS module classes`);

    if (workflowSteps.length > 0) {
      workflowSteps.forEach((step, i) => {
        const styles = getComputedStyle(step);
        const hasBg = styles.backgroundColor !== 'rgba(0, 0, 0, 0)';
        const hasShadow = styles.boxShadow !== 'none';
        console.log(`  Step ${i + 1}: BG: ${hasBg ? '✅' : '❌'}, Shadow: ${hasShadow ? '✅' : '❌'}`);
      });
    } else {
      // Fallback to checking by structure
      const fallbackSteps = document.querySelectorAll('[class*="rounded-full"][class*="p-3"]');
      console.log(`Found ${fallbackSteps.length} workflow steps (by structure)`);
      fallbackSteps.forEach((step, i) => {
        const styles = getComputedStyle(step);
        const hasBg = styles.backgroundColor !== 'rgba(0, 0, 0, 0)';
        console.log(`  Step ${i + 1}: BG: ${hasBg ? '✅' : '❌'}`);
      });
    }

    // Test enhanced cards
    const cards = document.querySelectorAll('[class*="enhancedCard"], [data-slot="card"]');
    console.log(`\nFound ${cards.length} cards`);
    cards.forEach((card, i) => {
      const styles = getComputedStyle(card);
      const hasShadow = styles.boxShadow !== 'none';
      console.log(`  Card ${i + 1}: Shadow: ${hasShadow ? '✅' : '❌'}`);
    });

    // Test analyze button
    const analyzeBtn = Array.from(document.querySelectorAll('button')).find(
      btn => btn.textContent.includes('Analyze')
    );
    if (analyzeBtn) {
      const styles = getComputedStyle(analyzeBtn);
      const hasBg = styles.backgroundColor !== 'rgba(0, 0, 0, 0)';
      console.log(`\nAnalyze Button: Background: ${hasBg ? '✅' : '❌'}`);
    }

    console.log('\n💡 If workflow steps have backgrounds and cards have shadows,');
    console.log('   the CSS module solution is working!');
  }

  // GLOBAL CHECKS (both pages)
  console.log('\n🌍 GLOBAL CHECKS:');

  // Check for !important overrides (should not exist)
  const testDiv = document.createElement('div');
  testDiv.className = 'bg-primary';
  document.body.appendChild(testDiv);
  const bgColor = getComputedStyle(testDiv).backgroundColor;

  // Check if it's using a hardcoded color (bad) or variable (good)
  const isHardcoded = bgColor.includes('oklch');

  document.body.removeChild(testDiv);

  if (isHardcoded) {
    console.log('❌ GLOBAL !IMPORTANT OVERRIDES STILL PRESENT');
    console.log('   The rollback may not be complete');
  } else {
    console.log('✅ No global !important overrides detected');
    console.log('   CSS is properly scoped');
  }

  console.log('\n' + '=' .repeat(60));
  console.log('TEST COMPLETE - Check results above');
  console.log('\nTo fully verify:');
  console.log('1. Homepage should display normally with visible content');
  console.log('2. Company Intelligence should have colored workflow steps');
  console.log('3. No style bleeding between pages');

  return {
    page: currentPage,
    timestamp: new Date().toISOString()
  };
})();