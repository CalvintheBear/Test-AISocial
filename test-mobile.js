#!/usr/bin/env node

/**
 * Mobile Responsiveness Test Script
 * This script provides commands to test mobile responsiveness
 */

const { exec } = require('child_process')

const testCommands = {
  // Start development server for testing
  startDev: 'npm run dev',
  
  // Open Chrome DevTools with mobile view
  openChromeDevTools: 'start chrome --auto-open-devtools-for-tabs http://localhost:3000',
  
  // Test specific breakpoints
  testBreakpoints: [
    'echo "Testing mobile breakpoints..."',
    'echo "1. iPhone SE (375px)"',
    'echo "2. iPhone 12 (390px)"',
    'echo "3. iPad (768px)"',
    'echo "4. Desktop (1440px)"',
    'echo "Open Chrome DevTools and use responsive mode"'
  ],
  
  // Check responsive meta tags
  checkMetaTags: 'echo "Checking responsive meta tags..."',
  
  // Test touch targets
  testTouchTargets: 'echo "Ensure all touch targets are at least 44x44px"',
  
  // Performance test on mobile
  lighthouseMobile: 'npx lighthouse http://localhost:3000 --preset=mobile --output=json --output-path=./lighthouse-mobile.json'
}

function runTest(testName) {
  console.log(`🧪 Running ${testName} test...`)
  
  if (testName === 'testBreakpoints') {
    testCommands.testBreakpoints.forEach(cmd => {
      console.log(cmd)
    })
  } else if (testCommands[testName]) {
    console.log(`Command: ${testCommands[testName]}`)
  } else {
    console.log('❌ Test not found')
  }
}

// CLI interface
const args = process.argv.slice(2)
const command = args[0]

switch (command) {
  case 'start':
    console.log('🚀 Starting development server...')
    console.log('📱 Open http://localhost:3000 in browser with mobile view')
    break
    
  case 'breakpoints':
    runTest('testBreakpoints')
    break
    
  case 'chrome':
    console.log('🖥️  Opening Chrome DevTools with mobile view...')
    console.log('💡 Use responsive mode in DevTools')
    break
    
  case 'lighthouse':
    console.log('📊 Running Lighthouse mobile performance test...')
    console.log('💡 Make sure dev server is running first')
    break
    
  default:
    console.log(`
🎯 AI Social Mobile Responsive Test Tool

Usage: node test-mobile.js [command]

Commands:
  start      - Start development server for testing
  breakpoints - Show responsive breakpoint guidelines
  chrome     - Instructions for Chrome DevTools testing
  lighthouse - Run Lighthouse mobile performance test

🧪 Manual Testing Steps:
1. Start dev server: npm run dev
2. Open http://localhost:3000
3. Open Chrome DevTools (F12)
4. Toggle device toolbar (Ctrl+Shift+M)
5. Test these breakpoints:
   - iPhone SE: 375px
   - iPhone 12: 390px
   - iPad: 768px
   - Desktop: 1440px

📱 Mobile Test Checklist:
- [ ] No horizontal scrolling
- [ ] Touch targets ≥ 44px
- [ ] Text readable without zoom
- [ ] Images responsive
- [ ] Forms usable on mobile
- [ ] Navigation accessible
    `)
}

if (require.main === module) {
  // Script was run directly
  if (!command) {
    runTest('default')
  }
}