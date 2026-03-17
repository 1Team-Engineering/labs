# 1Team Layout System

## Container System

### Max Width
All content is constrained to `max-w-7xl` (1280px) and centered with `mx-auto`.

```tsx
// Standard container pattern
<div className="mx-auto max-w-7xl px-4">
  {children}
</div>
```

### Horizontal Padding
- Mobile: `px-4` (16px each side)
- No breakpoint changes — padding stays constant

---

## Section Spacing

### Vertical Rhythm

| Context | Classes | Value |
|---------|---------|-------|
| Standard section | `py-16` to `py-24` | 64px–96px |
| Footer | `py-16` | 64px |
| Hero | `min-h-screen pt-24` | Full viewport height, 96px top |
| Section gap between elements | `mt-16`, `mt-10` | 64px, 40px |

### Inner Spacing

| Context | Classes | Value |
|---------|---------|-------|
| Eyebrow to heading | `mb-3` | 12px |
| Heading to description | `mt-4` | 16px |
| Description to CTA | `mt-10` | 40px |
| Card content | `mt-3` to `mt-4` | 12–16px |
| Footer column spacing | `space-y-2` | 8px |

---

## Grid System

### Standard Grids

```tsx
// 4-column footer grid
<div className="grid gap-10 md:grid-cols-4">

// 2-column content grid (e.g., about section)
<div className="grid gap-10 md:grid-cols-2">

// Auto-fit card grid
<div className="grid gap-6 md:grid-cols-3">
```

### Hero Layout
```tsx
// Full-screen centered
<section className="relative flex min-h-screen items-center overflow-hidden px-4 pt-24">
  <div className="mx-auto max-w-7xl text-center">
```

### Flex Patterns
```tsx
// Navbar
<nav className="flex max-w-7xl items-center justify-between">

// Button group
<div className="flex flex-col justify-center gap-4 sm:flex-row">

// Logo / pill wrapper
<div className="inline-flex rounded-full bg-white px-3 py-1">
```

---

## Responsive Breakpoints

Using Tailwind v4 defaults:

| Breakpoint | Size | Usage in 1team.io |
|-----------|------|-------------------|
| `sm:` | 640px | Button group flex direction |
| `md:` | 768px | Grid columns, font sizes, nav desktop |
| `lg:` | 1024px | Not commonly used |
| `xl:` | 1280px | Not used (max-w-7xl handles it) |

The design is primarily **mobile-first with a single md: breakpoint** — very clean.

---

## Z-Index Layers

| Layer | z-index | Usage |
|-------|---------|-------|
| Navbar | `z-50` | Fixed header |
| Background elements | `-z-10` | Grid patterns, gradients |
| Normal content | `0` | Default |

---

## Position Patterns

```tsx
// Fixed navbar
className="fixed inset-x-0 top-0 z-50"

// Mobile drawer
className="fixed inset-y-0 right-0 w-72"

// Background layers
className="absolute inset-0 -z-10"
```

---

## Overflow Handling

```tsx
// Hero section hides overflow for parallax effects
<section className="relative overflow-hidden">

// Mobile menu clips outside viewport
className="fixed inset-y-0 right-0"
```

---

## Spacing Scale Reference

```
4  = 16px  (px-4, gap-4)
6  = 24px  (gap-6)
8  = 32px  (p-8)
10 = 40px  (mt-10, gap-10)
16 = 64px  (py-16)
24 = 96px  (pt-24)
```
