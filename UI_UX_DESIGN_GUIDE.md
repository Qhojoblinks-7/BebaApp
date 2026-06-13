# Mobile-First Web Application UI/UX Design Guide

## Core Principles

### Mobile-First Philosophy
- Design for the smallest screen first, then scale up
- Prioritize content and core functionality
- Ensure touch targets are minimum 44x44 pixels (48x48 recommended)
- Optimize for portrait orientation as primary use case

### Viewport Configuration
```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
```

## Touch-Friendly Navigation Patterns

### Bottom Tab Bar (Primary Navigation)
```css
/* Fixed bottom positioning */
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding-bottom: env(safe-area-inset-bottom);
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  gap: 4px;
}

.tab-item.active {
  transform: translateY(-4px);
}
```

### Navigation Hierarchy
- **Primary**: Bottom tab bar (3-5 items max)
- **Secondary**: Floating action button or top-level buttons
- **Tertiary**: Hierarchical navigation with back buttons

### Hamburger Menu Alternative
Avoid traditional hamburger menus on mobile. Use:
- Bottom tab bars with 4-5 core sections
- FAB (Floating Action Button) for primary action
- Contextual actions within screens

## Card-Based Layouts

### Base Card Structure
```css
.card {
  background: white;
  border-radius: 16px;
  margin-bottom: 12px;
  padding: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.card--elevated {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.card--interactive {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.card--interactive:active {
  transform: scale(0.98);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}
```

### Card Variants
| Variant | Use Case | Padding | Border Radius |
|---------|----------|---------|---------------|
| Standard | List items, content blocks | 16px | 16px |
| Elevated | Primary actions, featured content | 20px | 24px |
| Minimal | Read-only info, subtle separation | 12px | 12px |

## Typography for Small Screens

### Font Scale System
```css
.text-display { font-size: 28px; line-height: 1.2; font-weight: 800; }
.text-title { font-size: 22px; line-height: 1.3; font-weight: 700; }
.text-heading { font-size: 18px; line-height: 1.3; font-weight: 600; }
.text-body { font-size: 16px; line-height: 1.5; font-weight: 400; }
.text-label { font-size: 14px; line-height: 1.4; font-weight: 500; }
.text-caption { font-size: 12px; line-height: 1.4; font-weight: 500; }
.text-micro { font-size: 10px; line-height: 1.3; font-weight: 600; text-transform: uppercase; }
```

### Readability Guidelines
- Minimum 16px for body text (prevents zoom on iOS)
- Line height: 1.5 for body, 1.3 for headings
- Contrast ratio minimum 4.5:1 (WCAG AA)
- Use system fonts for performance: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto`

## Gesture-Inspired Interactions

### Swipe Actions
```javascript
// Detect swipe direction
const handleTouchStart = (e) => {
  touchStartX = e.touches[0].clientX
}

const handleTouchEnd = (e) => {
  const delta = touchStartX - e.changedTouches[0].clientX
  if (delta > 100) onSwipeLeft()
  if (delta < -100) onSwipeRight()
}
```

Common patterns:
- **Swipe left**: Delete, archive, or reveal actions
- **Swipe right**: Return, refresh, or secondary actions
- **Long press**: Context menu or selection mode

### Pull-to-Refresh
```css
.refresh-indicator {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translateY(-100%);
  transition: transform 0.3s ease;
}

.refresh-indicator--active {
  transform: translateY(0);
}
```

### Touch Feedback States
```css
.btn {
  /* Immediate visual feedback */
  transition: all 0.1s ease;
}

.btn:active {
  transform: scale(0.95);
  opacity: 0.9;
}

.btn--ripple {
  position: relative;
  overflow: hidden;
}

.btn--ripple::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.1);
  transform: translate(-50%, -50%);
  transition: width 0.3s, height 0.3s;
}

.btn--ripple:active::after {
  width: 200px;
  height: 200px;
}
```

## Responsive Components

### Flexible Grid System
```css
.container {
  padding: 0 16px;
  max-width: 600px;
  margin: 0 auto;
}

.grid {
  display: grid;
  gap: 12px;
}

.grid--2col {
  grid-template-columns: repeat(2, 1fr);
}

@media (max-width: 768px) {
  .grid--2col {
    grid-template-columns: 1fr;
  }
}
```

### Adaptive Spacing
Use CSS clamp() for fluid typography and spacing:
```css
.spacing-section { padding: clamp(16px, 4vw, 32px); }
.text-responsive { font-size: clamp(16px, 4vw, 24px); }
```

### Safe Area Handling
```css
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

.safe-area-top {
  padding-top: env(safe-area-inset-top);
}
```

## Native-Like UI Components

### Status Bar Mimic
```css
.status-bar {
  height: env(safe-area-inset-top, 20px);
  background: white;
  width: 100%;
}
```

### Loading States
- Use skeleton screens instead of spinners
- Show content placeholders matching layout
- Animate gradient shimmer effect

### Empty States
```css
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.empty-state__icon {
  width: 80px;
  height: 80px;
  margin-bottom: 16px;
  opacity: 0.5;
}
```

## Animation & Transitions

### Easing Functions (Native-like)
```css
.ease-out { transition-timing-function: cubic-bezier(0.05, 0.7, 0.1, 1); } /* iOS-like */
.ease-in-out { transition-timing-function: cubic-bezier(0.3, 0, 0.7, 1); }
.spring { transition-timing-function: cubic-bezier(0.25, 0.1, 0.25, 1); }
```

### Page Transitions
```css
.page-enter {
  animation: slideInFromRight 0.3s ease-out;
}

@keyframes slideInFromRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
```

## PWA-Specific Considerations

### Install Prompt Design
- Trigger after 3-5 seconds of engagement
- Use native-like modal presentation
- Include clear value proposition

### Splash Screen
```html
<link rel="apple-touch-startup-image" href="/splash.png">
```

### Offline States
- Cache critical assets and data
- Show offline indicator at top
- Provide meaningful empty states

## Component Checklist

- [ ] All interactive elements ≥ 44px touch target
- [ ] Bottom navigation uses tab bar pattern
- [ ] Cards have subtle elevation and rounded corners
- [ ] Typography uses minimum 16px body size
- [ ] Gestures have immediate visual feedback
- [ ] Loading uses skeleton screens
- [ ] Safe areas respected on all devices
- [ ] Transitions match native easing curves
- [ ] PWA installable with clear prompt

## Dark Mode Adaptation

```css
@media (prefers-color-scheme: dark) {
  .card {
    background: #1e293b;
    border-color: #334155;
  }
  
  .text-primary { color: #f1f5f9; }
  .text-secondary { color: #94a3b8; }
}
```

## Performance Guidelines

- Minimize layout shifts (CLS < 0.1)
- Optimize first input delay (FID < 100ms)
- Keep animations smooth (FPS > 50)
- Lazy load images and components
- Preload critical routes