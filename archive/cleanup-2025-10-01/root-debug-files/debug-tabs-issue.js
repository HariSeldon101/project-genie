// TABS COMPONENT DIAGNOSTIC SCRIPT
// Run this in the browser console to debug the Tabs rendering issue

(() => {
  console.log('╔════════════════════════════════════════╗');
  console.log('║       TABS COMPONENT DIAGNOSTIC         ║');
  console.log('╚════════════════════════════════════════╝');

  // 1. Find the Tabs component
  console.log('\n1️⃣ TABS STRUCTURE CHECK:');

  const tabList = document.querySelector('[role="tablist"]');
  console.log('TabList found:', !!tabList);

  if (tabList) {
    const tabs = tabList.querySelectorAll('[role="tab"]');
    console.log('Number of tabs:', tabs.length);

    tabs.forEach((tab, i) => {
      console.log(`Tab ${i}:`, {
        text: tab.textContent,
        value: tab.getAttribute('data-value'),
        state: tab.getAttribute('data-state'),
        ariaSelected: tab.getAttribute('aria-selected'),
        disabled: tab.getAttribute('data-disabled')
      });
    });
  }

  // 2. Find tab panels
  console.log('\n2️⃣ TAB PANELS CHECK:');

  const tabPanels = document.querySelectorAll('[role="tabpanel"]');
  console.log('Number of tab panels:', tabPanels.length);

  tabPanels.forEach((panel, i) => {
    const styles = window.getComputedStyle(panel);
    console.log(`Panel ${i}:`, {
      dataState: panel.getAttribute('data-state'),
      dataValue: panel.getAttribute('data-value'),
      hidden: panel.hidden,
      ariaHidden: panel.getAttribute('aria-hidden'),
      display: styles.display,
      visibility: styles.visibility,
      opacity: styles.opacity,
      height: styles.height,
      childrenCount: panel.children.length,
      hasContent: panel.innerHTML.length > 0,
      firstChildTag: panel.firstElementChild?.tagName
    });

    // Check if SiteAnalyzer is inside this panel
    const analyzer = panel.querySelector('[data-component="site-analyzer"]');
    if (analyzer) {
      console.log('   ✅ SiteAnalyzer found in this panel!');
    } else if (panel.querySelector('.flex.gap-2')) {
      console.log('   ⚠️ Panel has content but no SiteAnalyzer');
    }
  });

  // 3. Check active state
  console.log('\n3️⃣ ACTIVE STATE CHECK:');

  const activeTab = document.querySelector('[role="tab"][data-state="active"]');
  const activePanel = document.querySelector('[role="tabpanel"][data-state="active"]');

  console.log('Active tab:', {
    found: !!activeTab,
    text: activeTab?.textContent,
    value: activeTab?.getAttribute('data-value')
  });

  console.log('Active panel:', {
    found: !!activePanel,
    value: activePanel?.getAttribute('data-value'),
    hasContent: activePanel?.children.length > 0
  });

  // 4. Manual override test
  console.log('\n4️⃣ ATTEMPTING MANUAL FIX:');

  const analyzePanel = Array.from(tabPanels).find(p =>
    p.getAttribute('data-value') === 'analyze' ||
    p.getAttribute('value') === 'analyze'
  );

  if (analyzePanel) {
    console.log('Found analyze panel, attempting to force show...');
    analyzePanel.style.display = 'block';
    analyzePanel.style.visibility = 'visible';
    analyzePanel.style.opacity = '1';
    analyzePanel.removeAttribute('hidden');
    analyzePanel.setAttribute('data-state', 'active');
    console.log('✅ Forced analyze panel to show');

    // Check if content appears
    setTimeout(() => {
      const analyzer = analyzePanel.querySelector('[data-component="site-analyzer"]');
      if (analyzer) {
        console.log('🎉 SiteAnalyzer is now visible!');
      } else {
        console.log('❌ SiteAnalyzer still not in panel after forcing display');
        console.log('Panel HTML preview:', analyzePanel.innerHTML.substring(0, 200));
      }
    }, 100);
  } else {
    console.log('❌ Could not find analyze panel at all');
  }

  // 5. Check for shadcn/ui Tabs issues
  console.log('\n5️⃣ SHADCN/UI TABS CHECK:');

  // Check if Radix UI primitives are loaded
  const radixTabsRoot = document.querySelector('[data-orientation]');
  if (radixTabsRoot) {
    console.log('✅ Radix UI Tabs primitive detected');
    console.log('Orientation:', radixTabsRoot.getAttribute('data-orientation'));
  } else {
    console.log('⚠️ Radix UI Tabs primitive not found - component may not be initializing');
  }

  // 6. Direct render test
  console.log('\n6️⃣ DIRECT RENDER TEST:');
  console.log('Creating SiteAnalyzer directly in the DOM...');

  const testDiv = document.createElement('div');
  testDiv.style.cssText = 'border: 3px solid green; padding: 20px; margin: 20px;';
  testDiv.innerHTML = '<h3>If you see this green box, DOM manipulation works</h3>';

  const cardContent = document.querySelector('.space-y-6');
  if (cardContent) {
    cardContent.appendChild(testDiv);
    console.log('✅ Test div added - look for green box on page');
  }

  console.log('\n📊 SUMMARY:');
  console.log('- Check console logs above for activeTab value');
  console.log('- Look for "🎯 About to render SiteAnalyzer" in main console');
  console.log('- If that log appears but no component, React is failing silently');
  console.log('- If log doesn\'t appear, TabsContent isn\'t rendering its children');

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║         END OF DIAGNOSTIC              ║');
  console.log('╚════════════════════════════════════════╝');
})();