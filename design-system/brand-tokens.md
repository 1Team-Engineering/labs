# 1Team Brand Tokens

## Overview

1Team Technologies uses a **monochromatic zinc-based palette** — no accent or brand colors. The identity communicates premium, modern professionalism through contrast, typography weight, and whitespace rather than color.

---

## Color Palette

### Surface Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| Background | `bg-zinc-50` (`#fafafa`) | `bg-zinc-950` (`#09090b`) | Page background |
| Card / Panel | `bg-white` (`#ffffff`) | `bg-zinc-900` (`#18181b`) | Card surfaces |
| Navbar (scrolled) | `bg-white/80 backdrop-blur-xl` | `bg-zinc-950/75 backdrop-blur-xl` | Frosted glass nav |
| Logo pill | `bg-white` | `bg-zinc-100` | Logo wrapper |

### Text Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| Heading | `text-zinc-950` (`#09090b`) | `text-zinc-50` (`#fafafa`) | H1, H2 |
| Body | `text-zinc-900` (`#18181b`) | `text-zinc-100` (`#f4f4f5`) | Body text |
| Subtext | `text-zinc-600` (`#52525b`) | `text-zinc-300` (`#d4d4d8`) | Descriptions |
| Muted | `text-zinc-500` (`#71717a`) | `text-zinc-400` (`#a1a1aa`) | Eyebrows, captions |
| Nav links | `text-zinc-700` (`#3f3f46`) | `text-zinc-300` | Navigation |

### Border Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| Default | `border-zinc-200` (`#e4e4e7`) | `border-zinc-800` (`#27272a`) | Section dividers |
| Subtle | `border-zinc-300` (`#d4d4d8`) | `border-zinc-700` (`#3f3f46`) | Buttons, inputs |
| Navbar scrolled | `border-zinc-300/70` | `border-zinc-700/70` | Frosted nav border |
| Transparent | `border-transparent` | `border-transparent` | Nav at top of page |

### Interactive States

| State | Light | Dark |
|-------|-------|------|
| Primary button | `bg-zinc-900 text-white` | `bg-zinc-100 text-zinc-950` |
| Primary hover | `bg-zinc-700` | `bg-zinc-300` |
| Ghost button | `border-zinc-400 text-zinc-900` | `border-zinc-700 text-zinc-100` |
| Ghost hover | `border-zinc-900` | `border-zinc-100` |
| Link hover | `text-zinc-950` | `text-zinc-50` |

---

## Gradients

Used for hero backgrounds and section depth:

```css
/* Radial gradient background (hero) */
background: radial-gradient(circle at 20% 20%, rgba(120,120,120,0.16), transparent 40%),
            radial-gradient(circle at 80% 30%, rgba(100,100,100,0.14), transparent 42%),
            linear-gradient(to bottom, transparent, rgba(120,120,120,0.08));

/* Grid overlay pattern */
background: linear-gradient(rgba(120,120,120,0.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(120,120,120,0.12) 1px, transparent 1px);
background-size: 64px 64px;
mask-image: radial-gradient(ellipse at center, black 40%, transparent 75%);

/* Logo glow */
background: blur-3xl + bg-zinc-900/30 (light) / bg-zinc-100/30 (dark);
```

---

## Shadows

```css
/* Logo drop shadow */
drop-shadow: 0 10px 40px rgba(0,0,0,0.25)       /* light mode */
drop-shadow: 0 10px 40px rgba(255,255,255,0.2)  /* dark mode */
```

---

## Theme Switching

- Theme stored in `localStorage` key: `'1team-theme'`
- Applied via `.dark` class on `<html>` element
- Fallback to system preference (`prefers-color-scheme: dark`)
- Inline script in `<head>` prevents flash of wrong theme (FOIT)

```js
// Theme detection (runs before first paint)
const stored = localStorage.getItem('1team-theme');
const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const theme = stored ?? (systemDark ? 'dark' : 'light');
if (theme === 'dark') document.documentElement.classList.add('dark');
```

---

## CSS Custom Properties (Recommended Extraction)

For use in the Labs UI shell:

```css
:root {
  /* Surfaces */
  --1t-bg: #fafafa;
  --1t-bg-card: #ffffff;
  --1t-bg-dark: #09090b;
  --1t-bg-card-dark: #18181b;

  /* Text */
  --1t-text-heading: #09090b;
  --1t-text-body: #18181b;
  --1t-text-muted: #71717a;
  --1t-text-sub: #52525b;

  /* Borders */
  --1t-border: #e4e4e7;
  --1t-border-strong: #d4d4d8;

  /* Interactive */
  --1t-btn-primary-bg: #18181b;
  --1t-btn-primary-text: #ffffff;
  --1t-btn-primary-hover: #3f3f46;
}
```
