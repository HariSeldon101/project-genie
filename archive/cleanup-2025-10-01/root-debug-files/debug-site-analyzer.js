// SITE ANALYZER DIAGNOSTIC SCRIPT
// Run this in the browser console to debug the input field issue

(() => {
  console.log('╔════════════════════════════════════════╗');
  console.log('║     SITE ANALYZER DEBUG DIAGNOSTIC      ║');
  console.log('╚════════════════════════════════════════╝');

  // 1. Check for the component
  const component = document.querySelector('[data-component="site-analyzer"]');
  console.log('\n1️⃣ COMPONENT CHECK:');
  if (component) {
    console.log('   ✅ SiteAnalyzer component found in DOM');
    console.log('   Component:', component);
  } else {
    console.log('   ❌ SiteAnalyzer component NOT in DOM');
    console.log('   This means the component isn\'t rendering at all');
    return;
  }

  // 2. Find all potential input locations
  console.log('\n2️⃣ INPUT SEARCH:');
  const searches = {
    'By ID "domain"': document.getElementById('domain'),
    'By data-debug "domain-input"': document.querySelector('[data-debug="domain-input"]'),
    'By placeholder': document.querySelector('[placeholder="example.com"]'),
    'All inputs in component': document.querySelectorAll('[data-component="site-analyzer"] input'),
    'All inputs on page': document.querySelectorAll('input'),
    'Input wrapper': document.querySelector('[data-debug="input-wrapper"]'),
    'Input container': document.querySelector('[data-debug="input-container"]'),
    'Label element': document.querySelector('[data-debug="label"]')
  };

  Object.entries(searches).forEach(([key, element]) => {
    if (element && element.length !== undefined) {
      console.log(`   ${element.length > 0 ? '✅' : '❌'} ${key}: Found ${element.length} elements`);
      if (element.length > 0) {
        Array.from(element).forEach((el, i) => {
          console.log(`      [${i}]:`, el);
        });
      }
    } else if (element) {
      console.log(`   ✅ ${key}: Found`, element);
    } else {
      console.log(`   ❌ ${key}: Not found`);
    }
  });

  // 3. Deep dive on the input if found
  console.log('\n3️⃣ INPUT ANALYSIS:');
  const input = document.getElementById('domain') || document.querySelector('[data-debug="domain-input"]');

  if (input) {
    console.log('   ✅ Input element exists!');

    // Get computed styles
    const styles = window.getComputedStyle(input);
    const rect = input.getBoundingClientRect();

    console.log('   📐 Dimensions:', {
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left,
      right: rect.right,
      bottom: rect.bottom
    });

    console.log('   👁️ Visibility:', {
      display: styles.display,
      visibility: styles.visibility,
      opacity: styles.opacity,
      overflow: styles.overflow,
      position: styles.position,
      zIndex: styles.zIndex
    });

    console.log('   🎨 Appearance:', {
      backgroundColor: styles.backgroundColor,
      color: styles.color,
      border: styles.border,
      padding: styles.padding,
      fontSize: styles.fontSize,
      pointerEvents: styles.pointerEvents
    });

    // Check if visible
    const isVisible =
      rect.width > 0 &&
      rect.height > 0 &&
      styles.display !== 'none' &&
      styles.visibility !== 'hidden' &&
      parseFloat(styles.opacity) > 0;

    console.log(`   ${isVisible ? '✅' : '❌'} Input is ${isVisible ? 'VISIBLE' : 'NOT VISIBLE'}`);

    // Check parent chain
    console.log('\n   📦 Parent Chain:');
    let parent = input.parentElement;
    let level = 0;
    while (parent && level < 5) {
      const parentStyles = window.getComputedStyle(parent);
      const parentRect = parent.getBoundingClientRect();
      console.log(`      Level ${level}:`, {
        element: parent.tagName,
        class: parent.className,
        display: parentStyles.display,
        overflow: parentStyles.overflow,
        height: parentRect.height,
        visible: parentRect.height > 0
      });
      parent = parent.parentElement;
      level++;
    }

    // Try to make it visible
    console.log('\n   🔧 Attempting visibility fix...');
    input.style.cssText = `
      display: block !important;
      width: 100% !important;
      height: 40px !important;
      padding: 10px !important;
      font-size: 16px !important;
      border: 3px solid red !important;
      background-color: yellow !important;
      color: black !important;
      position: relative !important;
      z-index: 9999 !important;
      opacity: 1 !important;
      visibility: visible !important;
    `;
    console.log('   ⚡ Applied emergency styles (red border, yellow background)');
    console.log('   If you can see it now, the issue was CSS. If not, it\'s a rendering issue.');

  } else {
    console.log('   ❌ No input element found at all!');
    console.log('   This means React is not rendering the input element.');

    // Check for React errors
    const errorElement = document.querySelector('[style*="border: 2px solid red"]');
    if (errorElement) {
      console.log('   🔥 React error boundary triggered!');
      console.log('   Error content:', errorElement.textContent);
    }
  }

  // 4. Check React Fiber
  console.log('\n4️⃣ REACT FIBER CHECK:');
  const cardElement = document.querySelector('[data-component="site-analyzer"]');
  if (cardElement) {
    const reactKeys = Object.keys(cardElement).filter(key => key.startsWith('__react'));
    if (reactKeys.length > 0) {
      console.log('   ✅ React Fiber found:', reactKeys);
      const fiber = cardElement[reactKeys[0]];
      console.log('   Component type:', fiber?.elementType?.name || fiber?.type?.name);
      console.log('   Props:', fiber?.memoizedProps);
    } else {
      console.log('   ❌ No React Fiber found on element');
    }
  }

  // 5. Summary
  console.log('\n📊 SUMMARY:');
  const inputFound = !!document.getElementById('domain');
  const containerFound = !!document.querySelector('[data-debug="input-container"]');
  const labelFound = !!document.querySelector('[data-debug="label"]');

  if (inputFound) {
    console.log('✅ Input IS in the DOM but may have CSS issues');
  } else if (containerFound && labelFound) {
    console.log('⚠️ Container and Label render, but input doesn\'t');
    console.log('   → Check console for React errors during input render');
  } else if (containerFound) {
    console.log('⚠️ Container renders but contents don\'t');
    console.log('   → Check for conditional rendering issues');
  } else {
    console.log('❌ Nothing renders - component may be erroring early');
  }

  console.log('\n🔎 Check browser console for:');
  console.log('   - 🏗️ "Rendering" logs to see render flow');
  console.log('   - 🔥 Error messages during render');
  console.log('   - 🚀 Mount/unmount lifecycle logs');

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║          END OF DIAGNOSTIC             ║');
  console.log('╚════════════════════════════════════════╝');
})();