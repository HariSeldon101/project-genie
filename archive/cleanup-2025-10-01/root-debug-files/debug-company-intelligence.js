// Company Intelligence Debug Script
// Run this in browser console at http://localhost:3000/company-intelligence
// This provides comprehensive diagnostic information

(() => {
  console.log('%c=== COMPANY INTELLIGENCE DEBUG ===', 'font-size: 20px; color: blue; font-weight: bold');
  console.log('Timestamp:', new Date().toISOString());
  console.log('URL:', window.location.href);

  const diagnostics = {
    react: {},
    components: {},
    buttons: {},
    errors: [],
    performance: {}
  };

  // 1. Check React presence and version
  console.group('🔧 React Status');
  try {
    diagnostics.react.loaded = typeof React !== 'undefined';
    if (diagnostics.react.loaded && React.version) {
      diagnostics.react.version = React.version;
      console.log('✅ React loaded:', React.version);
    } else {
      console.log('❌ React not detected or no version info');
    }
  } catch (e) {
    console.log('❌ Error checking React:', e.message);
    diagnostics.errors.push(`React check: ${e.message}`);
  }
  console.groupEnd();

  // 2. Check for hydration mismatches
  console.group('💧 Hydration Check');
  try {
    const htmlSize = document.documentElement.outerHTML.length;
    diagnostics.hydration = {
      htmlSize: htmlSize,
      hasNextData: !!document.getElementById('__NEXT_DATA__')
    };
    console.log('HTML document size:', htmlSize, 'bytes');
    console.log('Has __NEXT_DATA__:', diagnostics.hydration.hasNextData);

    // Check for hydration error messages
    const consoleErrors = [];
    const originalError = console.error;
    console.error = function(...args) {
      consoleErrors.push(args.join(' '));
      originalError.apply(console, args);
    };

    // Restore after brief capture
    setTimeout(() => {
      console.error = originalError;
      const hydrationErrors = consoleErrors.filter(e => e.includes('hydration'));
      if (hydrationErrors.length > 0) {
        console.log('❌ Hydration errors detected:', hydrationErrors.length);
        diagnostics.errors.push(...hydrationErrors);
      } else {
        console.log('✅ No hydration errors detected');
      }
    }, 100);
  } catch (e) {
    console.log('❌ Error checking hydration:', e.message);
    diagnostics.errors.push(`Hydration check: ${e.message}`);
  }
  console.groupEnd();

  // 3. Check component mounting
  console.group('🎯 Component Analysis');
  try {
    // Check workflow steps
    const workflowSteps = document.querySelectorAll('[data-step-status]');
    diagnostics.components.workflowSteps = workflowSteps.length;
    console.log('Workflow steps found:', workflowSteps.length);

    if (workflowSteps.length > 0) {
      console.log('Step details:');
      workflowSteps.forEach((step, i) => {
        const status = step.dataset.stepStatus;
        const id = step.dataset.stepId;
        const bgColor = getComputedStyle(step).backgroundColor;
        const hasBg = bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent';

        console.log(`  Step ${i + 1} (${id}):`, {
          status: status || 'undefined',
          hasBackground: hasBg,
          bgColor: bgColor,
          classes: step.className.split(' ').slice(0, 5).join(' ') + '...'
        });
      });
    } else {
      console.log('⚠️ No workflow steps with data-step-status found');
      // Try alternative selector
      const altSteps = document.querySelectorAll('.rounded-full.p-3');
      if (altSteps.length > 0) {
        console.log(`Found ${altSteps.length} elements that might be workflow steps (by class)`);
      }
    }

    // Check cards
    const cards = document.querySelectorAll('[data-slot="card"], [data-debug="main-card"]');
    diagnostics.components.cards = cards.length;
    console.log('\nCards found:', cards.length);
    cards.forEach((card, i) => {
      const shadow = getComputedStyle(card).boxShadow;
      console.log(`  Card ${i + 1}:`, {
        hasShadow: shadow !== 'none',
        shadow: shadow.substring(0, 50) + '...'
      });
    });
  } catch (e) {
    console.log('❌ Error analyzing components:', e.message);
    diagnostics.errors.push(`Component analysis: ${e.message}`);
  }
  console.groupEnd();

  // 4. Check button functionality
  console.group('🔘 Button Analysis');
  try {
    const buttons = document.querySelectorAll('button');
    diagnostics.buttons.total = buttons.length;
    console.log('Total buttons found:', buttons.length);

    buttons.forEach((btn, i) => {
      const text = btn.textContent?.trim().substring(0, 20);
      const isDisabled = btn.disabled;
      const pointerEvents = getComputedStyle(btn).pointerEvents;
      const cursor = getComputedStyle(btn).cursor;
      const bgColor = getComputedStyle(btn).backgroundColor;

      // Check if button has click handlers
      const hasOnClick = btn.onclick !== null;
      const hasEventListeners = typeof getEventListeners !== 'undefined' ?
        Object.keys(getEventListeners(btn) || {}).length > 0 : 'unknown';

      console.log(`Button ${i + 1} "${text}..."`, {
        disabled: isDisabled,
        clickable: !isDisabled && pointerEvents !== 'none',
        cursor: cursor,
        hasOnClick: hasOnClick,
        hasListeners: hasEventListeners,
        backgroundColor: bgColor
      });

      // Special check for analyze button
      if (text?.toLowerCase().includes('analyze')) {
        diagnostics.buttons.analyzeButton = {
          found: true,
          disabled: isDisabled,
          testId: btn.dataset.testid
        };
        console.log('  📍 This is the Analyze button');
      }
    });
  } catch (e) {
    console.log('❌ Error analyzing buttons:', e.message);
    diagnostics.errors.push(`Button analysis: ${e.message}`);
  }
  console.groupEnd();

  // 5. Test clicking the analyze button
  console.group('🧪 Interactive Test');
  try {
    const analyzeBtn = document.querySelector('[data-testid="analyze-button"]') ||
                       Array.from(document.querySelectorAll('button'))
                         .find(btn => btn.textContent?.includes('Analyze'));

    if (analyzeBtn) {
      console.log('Found Analyze button, attempting test click...');

      // Capture console logs
      const logs = [];
      const originalLog = console.log;
      console.log = function(...args) {
        logs.push(args);
        originalLog.apply(console, args);
      };

      // Try clicking
      try {
        analyzeBtn.click();
        console.log = originalLog;
        console.log('✅ Click executed successfully');
        console.log('Captured logs during click:', logs.length);
        if (logs.length > 0) {
          console.log('First few logs:', logs.slice(0, 3));
        }
      } catch (clickError) {
        console.log = originalLog;
        console.log('❌ Error during click:', clickError.message);
        diagnostics.errors.push(`Button click: ${clickError.message}`);
      }
    } else {
      console.log('⚠️ Analyze button not found');
    }
  } catch (e) {
    console.log('❌ Error in interactive test:', e.message);
    diagnostics.errors.push(`Interactive test: ${e.message}`);
  }
  console.groupEnd();

  // 6. Check for CSS classes
  console.group('🎨 CSS Classes Check');
  try {
    const testClasses = [
      'bg-blue-500', 'bg-green-500', 'bg-red-500', 'bg-gray-200',
      'text-white', 'shadow-lg', 'animate-pulse'
    ];

    console.log('Testing if CSS classes are defined:');
    testClasses.forEach(className => {
      const testEl = document.createElement('div');
      testEl.className = className;
      document.body.appendChild(testEl);

      const styles = getComputedStyle(testEl);
      let works = false;

      if (className.startsWith('bg-')) {
        works = styles.backgroundColor !== 'rgba(0, 0, 0, 0)';
      } else if (className.startsWith('text-')) {
        works = styles.color !== 'rgb(0, 0, 0)';
      } else if (className.includes('shadow')) {
        works = styles.boxShadow !== 'none';
      } else if (className.includes('animate')) {
        works = styles.animation !== 'none 0s ease 0s 1 normal none running';
      }

      console.log(`  .${className}: ${works ? '✅' : '❌'}`);
      document.body.removeChild(testEl);
    });
  } catch (e) {
    console.log('❌ Error checking CSS classes:', e.message);
    diagnostics.errors.push(`CSS check: ${e.message}`);
  }
  console.groupEnd();

  // 7. Performance metrics
  console.group('⚡ Performance');
  try {
    const perf = performance.getEntriesByType('navigation')[0];
    if (perf) {
      diagnostics.performance = {
        pageLoad: Math.round(perf.loadEventEnd - perf.fetchStart),
        domReady: Math.round(perf.domContentLoadedEventEnd - perf.fetchStart),
        firstPaint: Math.round(perf.domInteractive - perf.fetchStart)
      };
      console.log('Page load time:', diagnostics.performance.pageLoad, 'ms');
      console.log('DOM ready time:', diagnostics.performance.domReady, 'ms');
      console.log('First paint:', diagnostics.performance.firstPaint, 'ms');
    }

    // Check for React performance
    const measures = performance.getEntriesByType('measure');
    const reactMeasures = measures.filter(m => m.name.includes('render') || m.name.includes('React'));
    if (reactMeasures.length > 0) {
      console.log(`React performance measures: ${reactMeasures.length}`);
      reactMeasures.slice(0, 5).forEach(m => {
        console.log(`  ${m.name}: ${Math.round(m.duration)}ms`);
      });
    }
  } catch (e) {
    console.log('❌ Error checking performance:', e.message);
    diagnostics.errors.push(`Performance check: ${e.message}`);
  }
  console.groupEnd();

  // 8. Check for debug mode
  console.group('🐛 Debug Mode');
  const debugIndicator = document.querySelector('.bg-yellow-300');
  if (debugIndicator && debugIndicator.textContent?.includes('DEBUG')) {
    console.log('✅ Debug mode is ON');
    diagnostics.debugMode = true;
  } else {
    console.log('⚠️ Debug mode indicator not found');
    diagnostics.debugMode = false;
  }
  console.groupEnd();

  // Final summary
  console.log('\n%c=== DIAGNOSTIC SUMMARY ===', 'font-size: 16px; color: green; font-weight: bold');
  console.log({
    reactOk: diagnostics.react.loaded,
    componentsFound: {
      steps: diagnostics.components.workflowSteps,
      cards: diagnostics.components.cards
    },
    buttonsFound: diagnostics.buttons.total,
    analyzeButton: diagnostics.buttons.analyzeButton,
    errorsCount: diagnostics.errors.length,
    debugMode: diagnostics.debugMode,
    performance: diagnostics.performance
  });

  if (diagnostics.errors.length > 0) {
    console.log('\n%c❌ ERRORS DETECTED:', 'color: red; font-weight: bold');
    diagnostics.errors.forEach((error, i) => {
      console.log(`${i + 1}. ${error}`);
    });
  }

  console.log('\n%c💡 RECOMMENDATIONS:', 'color: orange; font-weight: bold');
  if (!diagnostics.react.loaded) {
    console.log('• React not detected - check if page is loading correctly');
  }
  if (diagnostics.components.workflowSteps === 0) {
    console.log('• No workflow steps found - component may not be rendering');
  }
  if (diagnostics.buttons.total === 0) {
    console.log('• No buttons found - JavaScript may not be executing');
  }
  if (diagnostics.errors.length > 0) {
    console.log('• Errors detected - check console for details');
  }

  console.log('\n%c=== DEBUG COMPLETE ===', 'font-size: 16px; color: blue; font-weight: bold');

  return diagnostics;
})();