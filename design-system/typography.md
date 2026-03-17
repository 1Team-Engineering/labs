# 1Team Typography System

## Font Stack

```css
font-family: Inter, Arial, Helvetica, sans-serif;
```

- **Primary**: Inter (loaded locally in labs via `@fontsource-variable/inter`)
- **Fallbacks**: Arial, Helvetica, sans-serif
- **Rendering**: `antialiased` on `<body>`

---

## Type Scale

### Headings

| Element | Classes | Size (mobile → desktop) | Weight | Tracking |
|---------|---------|-------------------------|--------|---------|
| H1 (Hero) | `text-5xl md:text-7xl font-bold tracking-tight` | 48px → 72px | 700 | tight |
| H2 (Section) | `text-3xl md:text-5xl font-semibold tracking-tight` | 30px → 48px | 600 | tight |
| H3 (Card) | `text-xl font-semibold` | 20px | 600 | normal |
| H4 (Footer col) | `font-semibold` | 16px | 600 | normal |

### Body Text

| Usage | Classes | Size | Weight |
|-------|---------|------|--------|
| Hero subtitle | `text-lg md:text-2xl` | 18px → 24px | 400 |
| Section description | `text-base md:text-lg` | 16px → 18px | 400 |
| Body | `text-base` | 16px | 400 |
| Small / nav links | `text-sm` | 14px | 400 (nav: 400, buttons: 600) |
| Extra small | `text-xs` | 12px | 400 |

### Special

| Usage | Classes | Notes |
|-------|---------|-------|
| Eyebrow label | `text-xs uppercase tracking-[0.3em] text-zinc-500` | Section labels above headings |
| Copyright | `text-xs text-zinc-500` | Footer bottom |
| Footer links | `text-sm text-zinc-500` | List items |

---

## Line Heights

Tailwind defaults (not overridden):
- `text-xs/sm/base`: `leading-normal` (1.5)
- `text-lg/xl+`: `leading-tight` or `leading-snug` via tracking-tight

---

## Letter Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `tracking-tight` | `-0.025em` | H1, H2 headings |
| `tracking-[0.3em]` | `0.3em` | Eyebrow labels (ALL CAPS) |
| Normal | `0` | Body text, nav links |

---

## Component Typography Patterns

### SectionHeading Component
```tsx
// Eyebrow: text-xs uppercase tracking-[0.3em] text-zinc-500 mb-3
// Title: text-3xl md:text-5xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50
// Description: text-base md:text-lg text-zinc-600 dark:text-zinc-300 mt-4
// Container: mx-auto max-w-3xl text-center
```

### Navbar Links
```tsx
// text-sm text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50
```

### Button Text
```tsx
// text-sm font-semibold
```

---

## Responsive Behavior

The type scale consistently uses the `md:` breakpoint (768px) to scale up:
- Mobile: Compact scale (text-5xl body-lg text-base)
- Desktop: Expanded scale (text-7xl body-2xl text-lg)

No intermediate breakpoints used — clean binary responsive behavior.

---

## Usage in Labs

The labs project already loads Inter via `@fontsource-variable/inter` as a local font with CSS variable `--font-sans`. This matches 1team.io's font stack.

```tsx
// Already in labs/app/layout.tsx:
const inter = localFont({
  src: '../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  variable: '--font-sans',
  weight: '100 900',
});
```

No additional font loading needed — just ensure `font-family: var(--font-sans), Arial, Helvetica, sans-serif` is applied.
