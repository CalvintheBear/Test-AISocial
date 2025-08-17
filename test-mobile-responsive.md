# Mobile Responsiveness Test Checklist

## Test Environment Setup
- [ ] Test on actual mobile devices (iPhone/Android)
- [ ] Test on Chrome DevTools mobile emulation
- [ ] Test on Safari responsive design mode
- [ ] Test on Firefox responsive design mode

## Breakpoint Testing

### 📱 Mobile (320px - 768px)
- [ ] **iPhone SE (375px)**
- [ ] **iPhone 12/13/14 (390px)**
- [ ] **iPhone 14 Pro Max (430px)**
- [ ] **Android small (360px)**
- [ ] **Android large (412px)**

### 📱 Tablet (768px - 1024px)
- [ ] **iPad Mini (768px)**
- [ ] **iPad Air (820px)**
- [ ] **iPad Pro 11" (834px)**
- [ ] **iPad Pro 12.9" (1024px)**

### 💻 Desktop (1024px+)
- [ ] **Small laptop (1024px)**
- [ ] **Standard (1280px)**
- [ ] **Large (1440px)**
- [ ] **Extra large (1920px)**

## Component Testing

### Navigation
- [ ] Header navigation collapses to hamburger menu
- [ ] Sidebar becomes bottom navigation on mobile
- [ ] Search bar adjusts to mobile width
- [ ] User profile menu is accessible

### Artwork Grid
- [ ] Grid adjusts from 4 columns to 1 column
- [ ] Artwork cards maintain aspect ratio
- [ ] Touch targets are at least 44x44px
- [ ] Images load properly on mobile networks

### Artwork Details Page
- [ ] Image viewer is swipeable
- [ ] Like/favorite buttons are easily tappable
- [ ] Comments section is scrollable
- [ ] Share functionality works on mobile

### Forms
- [ ] Upload form is mobile-friendly
- [ ] Input fields are large enough for touch
- [ ] File picker works on mobile
- [ ] Form validation messages are visible

### Profile Page
- [ ] Profile header stacks vertically
- [ ] Stats are displayed clearly
- [ ] Tab navigation is touch-friendly
- [ ] Edit profile button is accessible

## Performance Testing
- [ ] Pages load within 3 seconds on 3G
- [ ] Images are optimized for mobile
- [ ] Lazy loading is implemented
- [ ] Skeleton states work correctly

## Touch Interactions
- [ ] Swipe gestures work for image galleries
- [ ] Pinch-to-zoom works for images
- [ ] Pull-to-refresh works where appropriate
- [ ] Touch feedback is provided

## Accessibility
- [ ] Font sizes are readable (minimum 16px)
- [ ] Color contrast meets WCAG standards
- [ ] Focus indicators are visible
- [ ] Screen reader navigation works

## Test Commands

### Manual Testing Commands
```bash
# Start development server
npm run dev

# Test on mobile network
# 1. Open Chrome DevTools
# 2. Enable "Network throttling" 
# 3. Select "Slow 3G"
# 4. Test page loads

# Test responsive breakpoints
# 1. Open Chrome DevTools
# 2. Click "Toggle device toolbar"
# 3. Test each breakpoint:
#    - iPhone SE (375px)
#    - iPhone 12 (390px)  
#    - iPad (768px)
#    - Desktop (1440px)
```

### Automated Testing Setup
```bash
# Install testing dependencies
npm install --save-dev @playwright/test

# Create mobile test config
# See playwright.config.ts for mobile devices
```

## Known Issues & Fixes

### Common Mobile Issues
1. **Horizontal scroll**
   - Fix: Check for overflow-x elements
   - Solution: Use `overflow-x-hidden` or responsive containers

2. **Touch targets too small**
   - Fix: Ensure minimum 44x44px touch targets
   - Solution: Use `min-h-[44px] min-w-[44px]` classes

3. **Font too small**
   - Fix: Use minimum 16px font size
   - Solution: `text-base` or `text-lg` for mobile

4. **Images not responsive**
   - Fix: Use `w-full h-auto` for images
   - Solution: Add `object-cover` for aspect ratios

## Validation Checklist

### ✅ Mobile Pass Criteria
- [ ] No horizontal scrolling
- [ ] All interactive elements are tappable
- [ ] Text is readable without zooming
- [ ] Forms are usable on mobile
- [ ] Navigation is accessible
- [ ] Loading states are visible
- [ ] Error states are clear

### Test Results
- **Date**: ___________
- **Tester**: ___________
- **Device**: ___________
- **Browser**: ___________
- **Network**: ___________
- **Overall Score**: ___/10

### Issues Found
| Issue | Severity | Fix Status |
|-------|----------|------------|
|       |          |            |
|       |          |            |
|       |          |            |

## Quick Test Steps
1. Open Chrome DevTools → Device Mode
2. Select "iPhone 12" preset
3. Navigate through each page
4. Test all interactive elements
5. Check loading states
6. Verify error handling
7. Test on actual device if possible