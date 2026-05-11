# UI_DESIGN.md - Windows 11 Fluent Design Specification

This document specifies all UI implementation details. Use it to implement pixel-perfect components.

## 1. Design System Overview

**Theme**: Windows 11 Fluent Dark  
**Color Mode**: Dark only (MVP)  
**Typography**: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif  
**Spacing Unit**: 4px (multiples of 4)  
**Breakpoints**: 1024px (desktop only for MVP)

## 2. Color Palette

### 2.1 Core Colors

```css
/* Primary Brand */
--color-primary: #0078d4;        /* Windows Blue */
--color-primary-dark: #005a9e;   /* Hover state */
--color-primary-light: #40b6ff;  /* Active/focus */

/* Neutral Background */
--bg-primary: #202020;           /* Main background */
--bg-secondary: #2d2d2d;         /* Secondary cards */
--bg-tertiary: #3a3a3a;          /* Hover state */

/* Neutral Text */
--text-primary: #ffffff;         /* Body text */
--text-secondary: #e0e0e0;       /* Secondary text */
--text-tertiary: #999999;        /* Disabled/muted */

/* Status Colors */
--color-success: #107c10;        /* Messages/success */
--color-warning: #ffd700;        /* Warnings/alerts */
--color-error: #c50f1f;          /* Errors/destructive */
--color-info: #0078d4;           /* Info (same as primary) */

/* Semantic */
--color-connected: #107c10;      /* Subscription active */
--color-disconnected: #c50f1f;   /* Connection failed */
--color-dnd: #ffd700;            /* Do Not Disturb active */
```

### 2.2 Transparency & Glass

```css
/* Fluent Glass/Mica Effect */
--glass-blur: backdrop-filter: blur(20px);
--glass-bg: rgba(32, 32, 32, 0.5);
--glass-border: rgba(255, 255, 255, 0.1);

/* Example: Glass card */
.card-glass {
  background-color: rgba(45, 45, 45, 0.4);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
}
```

## 3. Typography

### 3.1 Font Sizes & Weights

```css
/* Display (Headers) */
--font-display: 28px;    /* font-weight: 600 */

/* Headline (Section headers) */
--font-headline: 20px;   /* font-weight: 600 */

/* Subheading */
--font-subheading: 16px; /* font-weight: 500 */

/* Body (Default text) */
--font-body: 14px;       /* font-weight: 400 */

/* Small (Labels, captions) */
--font-small: 12px;      /* font-weight: 400 */

/* Caption (Timestamps, helper text) */
--font-caption: 11px;    /* font-weight: 400; color: var(--text-tertiary) */
```

### 3.2 Line Heights

```css
--line-height-display: 1.3;    /* 28px × 1.3 ≈ 36px */
--line-height-headline: 1.4;   /* 20px × 1.4 ≈ 28px */
--line-height-body: 1.5;       /* 14px × 1.5 ≈ 21px */
--line-height-small: 1.4;
```

## 4. Spacing & Layout

### 4.1 Spacing Scale

```css
/* All spacing in multiples of 4px */
--spacing-1: 4px;
--spacing-2: 8px;
--spacing-3: 12px;
--spacing-4: 16px;      /* Most common: padding, margins */
--spacing-5: 20px;
--spacing-6: 24px;
--spacing-8: 32px;
--spacing-10: 40px;
--spacing-12: 48px;
```

### 4.2 Component Spacing Defaults

```css
/* Padding inside containers */
.container {
  padding: var(--spacing-4);    /* 16px */
}

.card {
  padding: var(--spacing-6);    /* 24px */
}

/* Gaps between flex items */
.flex-group {
  gap: var(--spacing-4);        /* 16px */
}

/* Margins between sections */
.section {
  margin-bottom: var(--spacing-8); /* 32px */
}
```

### 4.3 Window Layout

```
┌─────────────────────────────────────────┐
│ App Header (52px)                       │
├─────────────────────────────────────────┤
│ Sidebar (280px) │ Main Content (flex)   │
│                 │                       │
│ - Subscriptions │ Inbox/Settings        │
│ - Settings      │ (Scrollable)          │
│                 │                       │
└─────────────────────────────────────────┘
```

**Window dimensions**:
- Min width: 800px
- Min height: 600px
- Default: 1000px × 700px

## 5. Component Specifications

### 5.1 Header

**Height**: 52px  
**Background**: `rgba(32, 32, 32, 0.8)` with glass effect  
**Border**: 1px solid `rgba(255, 255, 255, 0.08)`  

```tsx
// Header
<header className="h-13 flex items-center justify-between px-6 bg-slate-950/80 backdrop-blur border-b border-white/10">
  {/* Logo/Title */}
  <div className="flex items-center gap-3">
    <img src="logo.svg" className="w-6 h-6" />
    <span className="text-lg font-semibold">ntfy Desktop</span>
  </div>
  
  {/* Tray button */}
  <button className="p-2 hover:bg-white/10 rounded transition">
    {/* Minimize to tray icon */}
  </button>
</header>
```

### 5.2 Sidebar

**Width**: 280px (fixed)  
**Background**: `var(--bg-primary)`  
**Border**: 1px solid `rgba(255, 255, 255, 0.08)` on right  

**Sections**:
1. **Subscriptions** (scrollable list)
2. **Settings** (fixed at bottom)

```tsx
// Sidebar item
<div className="px-4 py-3 hover:bg-slate-800/50 cursor-pointer rounded-lg transition">
  <div className="flex items-center justify-between">
    <span className="font-medium">{topic}</span>
    <div className="w-2 h-2 rounded-full bg-green-500"></div>
  </div>
  <span className="text-xs text-slate-400">{url}</span>
</div>
```

**Connection indicator**:
- Green dot: Connected
- Red dot: Disconnected
- Orange dot: Reconnecting

### 5.3 Main Content Area

**Layout**: Tabbed interface
- Tab 1: Inbox
- Tab 2: Settings

**Tab styling**:
```tsx
<div className="flex gap-0 border-b border-white/10">
  <button className={`px-6 py-3 text-sm font-medium transition ${
    active ? 'border-b-2 border-blue-500' : 'text-slate-400'
  }`}>
    Inbox
  </button>
  <button className={`px-6 py-3 text-sm font-medium transition ${
    active ? 'border-b-2 border-blue-500' : 'text-slate-400'
  }`}>
    Settings
  </button>
</div>
```

### 5.4 Inbox Component

**Layout**: List + Detail panel

```
┌──────────────────────┬──────────────────┐
│ Message List (50%)   │ Message Detail   │
│ ┌────────────────┐  │ (50%) - Collapsible│
│ │ • Message 1    │  │                   │
│ │ • Message 2    │  │ [Show full text]  │
│ │ • Message 3    │  │                   │
│ └────────────────┘  │ [Delete] [Archive]│
│ [Load more...]       │                   │
└──────────────────────┴──────────────────┘
```

**Message list item**:
```tsx
<div className="p-4 border-b border-white/5 hover:bg-slate-800/30 cursor-pointer transition">
  <div className="flex items-start justify-between">
    <div className="flex-1">
      <h3 className="font-semibold text-white">{message.title}</h3>
      <p className="text-sm text-slate-400 line-clamp-2">{message.body}</p>
    </div>
    <span className="text-xs text-slate-500 whitespace-nowrap ml-2">
      {formatTime(message.timestamp)}
    </span>
  </div>
  <div className="flex items-center gap-2 mt-2">
    <span className="inline-block px-2 py-1 text-xs bg-blue-500/20 text-blue-300 rounded">
      {message.topic}
    </span>
    {message.priority && (
      <span className={`inline-block px-2 py-1 text-xs rounded ${
        message.priority === 'high' ? 'bg-red-500/20 text-red-300' : 'bg-slate-500/20 text-slate-300'
      }`}>
        {message.priority}
      </span>
    )}
  </div>
</div>
```

**Message detail panel**:
```tsx
<div className="flex-1 overflow-y-auto p-6 space-y-4">
  <div>
    <h2 className="text-xl font-semibold mb-2">{message.title}</h2>
    <p className="text-slate-400 text-sm">{message.timestamp}</p>
  </div>
  
  <div className="prose prose-invert">
    <p>{message.body}</p>
  </div>
  
  <div className="flex gap-2 pt-4">
    <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition">
      Delete
    </button>
    <button className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded transition">
      Mark as Read
    </button>
  </div>
</div>
```

### 5.5 Subscription Manager

**Add Subscription Dialog**:
```tsx
<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
  <div className="bg-slate-900 border border-white/10 rounded-lg p-6 w-96 shadow-2xl">
    <h2 className="text-lg font-semibold mb-4">Add Subscription</h2>
    
    <input 
      type="text" 
      placeholder="ntfy server URL (http://localhost:8080)"
      className="w-full px-4 py-2 bg-slate-800 border border-white/20 rounded mb-4 text-white placeholder-slate-500 focus:border-blue-500 outline-none"
    />
    
    <input 
      type="text" 
      placeholder="Topic name"
      className="w-full px-4 py-2 bg-slate-800 border border-white/20 rounded mb-6 text-white placeholder-slate-500 focus:border-blue-500 outline-none"
    />
    
    <div className="flex gap-2">
      <button className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition">
        Add
      </button>
      <button className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-medium transition">
        Cancel
      </button>
    </div>
  </div>
</div>
```

**Subscription list item** (in Settings):
```tsx
<div className="p-4 bg-slate-800/50 border border-white/10 rounded-lg flex items-center justify-between">
  <div className="flex-1">
    <p className="font-medium">{subscription.topic}</p>
    <p className="text-sm text-slate-400">{subscription.url}</p>
  </div>
  <div className="flex items-center gap-2">
    <div className={`w-2 h-2 rounded-full ${subscription.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
    <button className="p-2 hover:bg-red-500/20 text-red-400 rounded transition">
      <Trash size={16} />
    </button>
  </div>
</div>
```

### 5.6 Settings Component

**Sections**:
1. Subscriptions Management
2. Do Not Disturb
3. Notifications
4. Application

```tsx
// Settings section
<div className="mb-8">
  <h3 className="text-lg font-semibold mb-4">Do Not Disturb</h3>
  
  <div className="space-y-4">
    <div className="flex items-center justify-between p-4 bg-slate-800/50 border border-white/10 rounded-lg">
      <span className="text-sm">Enable DND</span>
      <input type="checkbox" className="w-5 h-5 cursor-pointer" />
    </div>
    
    <div className="grid grid-cols-2 gap-4">
      <input 
        type="time" 
        value="22:00"
        className="px-3 py-2 bg-slate-800 border border-white/20 rounded text-white"
      />
      <input 
        type="time" 
        value="08:00"
        className="px-3 py-2 bg-slate-800 border border-white/20 rounded text-white"
      />
    </div>
  </div>
</div>
```

### 5.7 Buttons & Interactive Elements

**Primary Button**:
```tsx
<button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg font-medium transition-colors duration-150">
  Action
</button>
```

**Secondary Button**:
```tsx
<button className="px-6 py-2 bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-white rounded-lg font-medium transition-colors duration-150">
  Cancel
</button>
```

**Icon Button** (Tray, close):
```tsx
<button className="p-2 hover:bg-white/10 active:bg-white/20 rounded-lg transition-colors duration-150">
  <Icon size={20} />
</button>
```

**Disabled State**:
```tsx
<button disabled className="px-6 py-2 bg-slate-600 text-slate-400 rounded-lg font-medium cursor-not-allowed opacity-50">
  Disabled
</button>
```

### 5.8 Inputs & Forms

**Text Input**:
```tsx
<input 
  type="text"
  placeholder="Placeholder text"
  className="w-full px-4 py-2 bg-slate-800 border border-white/20 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-colors"
/>
```

**Time Input**:
```tsx
<input 
  type="time"
  className="px-4 py-2 bg-slate-800 border border-white/20 rounded-lg text-white focus:border-blue-500 focus:outline-none"
/>
```

**Checkbox**:
```tsx
<label className="flex items-center gap-2 cursor-pointer">
  <input type="checkbox" className="w-5 h-5" />
  <span className="text-sm">Option label</span>
</label>
```

**Number Input** (Volume slider):
```tsx
<input 
  type="range" 
  min="0" 
  max="100" 
  className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
/>
```

### 5.9 Badges & Labels

**Tag/Badge**:
```tsx
<span className="inline-block px-3 py-1 text-xs font-medium bg-blue-500/20 text-blue-300 rounded-full">
  Active
</span>
```

**Status Badge** (Connected/Disconnected):
```tsx
/* Connected */
<span className="inline-flex items-center gap-2 px-3 py-1 text-xs bg-green-500/20 text-green-300 rounded-full">
  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
  Connected
</span>

/* Disconnected */
<span className="inline-flex items-center gap-2 px-3 py-1 text-xs bg-red-500/20 text-red-300 rounded-full">
  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
  Disconnected
</span>
```

## 6. Responsive Behavior

### 6.1 Desktop (1024px+)

- Sidebar: 280px (visible)
- Two-column layout: List + Detail
- Full navigation visible

### 6.2 Tablet/Small Desktop (768px - 1024px)

- Sidebar: 240px (collapsible)
- List: 40%, Detail: 60%
- Adjust spacing: `-spacing-3` instead of `-spacing-4`

### 6.3 Mobile (< 768px)

- Sidebar: Hidden (hamburger menu)
- Single column (Inbox or Settings)
- Bottom navigation tabs
- Adjusted typography: `-body: 13px`, `-caption: 10px`

**For MVP**: Only implement desktop (1024px+). Mobile/tablet support in Phase 2.

## 7. Animation & Transitions

### 7.1 Global Transitions

```css
* {
  transition-property: background-color, border-color, color, opacity;
  transition-duration: 150ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
```

### 7.2 Specific Animations

**Fade in** (component mount):
```tsx
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
  {/* Content */}
</motion.div>
```

**Slide in** (sidebar toggle):
```tsx
<motion.div 
  initial={{ x: -280 }} 
  animate={{ x: 0 }} 
  transition={{ duration: 0.3 }}
>
  {/* Sidebar */}
</motion.div>
```

**Scale on hover** (buttons, list items):
```css
button:hover {
  transform: scale(1.02);
}
```

## 8. Accessibility Standards

### 8.1 Color Contrast

**All text must meet WCAG AA**:
- Primary text (#fff) on dark bg (#202020): ✅ 19.98:1
- Secondary text (#e0e0e0) on dark bg: ✅ 14.5:1
- Error text (#c50f1f) on white: ✅ 5.5:1

### 8.2 Focus Indicators

```css
button:focus-visible {
  outline: 2px solid #0078d4;
  outline-offset: 2px;
}
```

### 8.3 Keyboard Navigation

- Tab through all interactive elements
- Enter/Space to activate buttons
- Escape to close dialogs
- Arrow keys in lists (future enhancement)

## 9. Dark Mode Guidelines

**MVP is dark-only**. If light mode added later:

```css
@media (prefers-color-scheme: light) {
  :root {
    --bg-primary: #ffffff;
    --bg-secondary: #f5f5f5;
    --text-primary: #000000;
    --text-secondary: #333333;
  }
}
```

## 10. Implementation Checklist

- [ ] All colors use CSS variables
- [ ] All spacing uses `--spacing-*` scale
- [ ] Typography follows font size/weight table
- [ ] All buttons have hover/active states
- [ ] All inputs have focus indicators
- [ ] Glass effect applied to backgrounds
- [ ] Status indicators (green/red dots) on subscriptions
- [ ] Do Not Disturb UI complete
- [ ] Message list with detail panel
- [ ] Subscription management CRUD UI
- [ ] Settings panel with all options
- [ ] Responsive (desktop only for MVP)
- [ ] No hardcoded colors (use CSS vars)
- [ ] Accessibility: color contrast verified
- [ ] Accessibility: keyboard navigation works

---

**Version**: 1.0  
**Last Updated**: 2026-05-11  
**Design System**: Windows 11 Fluent Dark  

Use Tailwind classes with the color palette above. Do not add custom CSS unless unavoidable.
