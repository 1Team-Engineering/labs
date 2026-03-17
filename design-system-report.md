# 1Team Product Ecosystem — Design System Report

**Date**: 2026-03-17
**Scope**: 1team.io (marketing site) + labs.1team.io (training portal)
**Goal**: Create a consistent product ecosystem sharing the same visual identity

---

## 1. Extracted Brand System Overview

### Identity
**Brand**: 1Team Technologies
**Tagline**: "Engineering Software. Enabling AI. Empowering Business."
**Personality**: Premium, professional, minimal — monochromatic confidence

### Color System
1team.io uses a **pure zinc monochrome palette** — no accent colors. Identity is conveyed through contrast, typography weight, and whitespace rather than color.

| Role | Light | Dark |
|------|-------|------|
| Page background | `zinc-50` | `zinc-950` |
| Card surfaces | `white` | `zinc-900` |
| Heading text | `zinc-950` | `zinc-50` |
| Body text | `zinc-900` | `zinc-100` |
| Muted text | `zinc-500–600` | `zinc-300–400` |
| Borders | `zinc-200–300` | `zinc-700–800` |
| Primary button | `zinc-900 bg` | `zinc-100 bg` |

### Typography
- **Font**: Inter (variable), Arial fallback
- **Headings**: `font-bold/semibold tracking-tight`
- **Eyebrow labels**: `text-xs uppercase tracking-[0.3em] text-zinc-500`
- **Scale**: H1 (5xl→7xl), H2 (3xl→5xl), body (base→lg)

### Layout
- **Container**: `max-w-7xl mx-auto px-4`
- **Section rhythm**: `py-16 md:py-24`
- **Grid**: 1 → 2 → 4 columns via `md:` breakpoint
- **Border radius**: `rounded-full` (pills), `rounded-2xl` (cards)

### Animation
- **Library**: GSAP + ScrollTrigger
- **Pattern**: `fromTo opacity:0,y:60 → opacity:1,y:0` on scroll
- **Reduced motion**: Respected via `prefersReducedMotion()`
- **Navbar**: Transparent → frosted glass at `scrollY > 12`

**Documentation**: See `/labs/design-system/` for full extracted design system docs.

---

## 2. Components Created

### Design System Documentation (`/labs/design-system/`)
| File | Contents |
|------|----------|
| `brand-tokens.md` | Colors, gradients, shadows, CSS custom properties |
| `typography.md` | Font stack, type scale, line heights, letter spacing |
| `layout-system.md` | Container system, grid patterns, breakpoints, z-index |
| `component-patterns.md` | Button, card, badge, SectionHeading, CTA, input patterns |
| `navigation.md` | Navbar structure, scroll behavior, mobile drawer |
| `footer.md` | Footer layout, column structure, adaptation guide |
| `assets.md` | Logo usage rules, icon library, background patterns |

### UI Shell (`/labs/ui/`)
| Component | File | Description |
|-----------|------|-------------|
| Design tokens | `tokens/colors.css` | CSS custom properties for zinc palette |
| Typography tokens | `tokens/typography.css` | Font/scale variables |
| Shell | `layout/Shell.tsx` | Full-page wrapper with zinc bg/text |
| Container | `layout/Container.tsx` | max-w-7xl responsive container |
| Section | `layout/Section.tsx` | Standard section with py-16 md:py-24 |
| Navbar | `header/Navbar.tsx` | Floating pill nav with 1Team logo + back-link |
| Footer | `footer/Footer.tsx` | 4-column footer with 1Team branding |
| Button1T | `buttons/Button.tsx` | Primary/Ghost pill buttons matching 1team.io |
| Card1T | `cards/Card.tsx` | Zinc-bordered card with optional hover |
| SectionHeading | `typography/SectionHeading.tsx` | Eyebrow/title/description pattern |
| Index | `index.ts` | Barrel export for all UI shell components |

### Copied Assets
- `/labs/public/logo/1team-logo.png` — 1Team logo for use in UI shell

---

## 3. Training Portal Styling Changes

### Applied in Phase 3 (`/labs/app/`)

| Change | File | Description |
|--------|------|-------------|
| Metadata update | `app/layout.tsx` | Updated to "1Team Labs" branding with proper OpenGraph |
| 1Team token imports | `app/globals.css` | Imports `ui/tokens/colors.css` and `ui/tokens/typography.css` |
| Background color | `app/page.tsx` | Changed from `slate-50/100` to `zinc-50/100` (matches 1team.io) |
| Background decor | `app/page.tsx` | Changed from blue/purple blobs to zinc/neutral tones |
| 1Team top-left link | `app/page.tsx` | Fixed pill with 1Team logo + "Labs" badge, links to 1team.io |
| 1Team footer | `app/page.tsx` | Replaced "OpenMAIC Open Source Project" with full 1Team footer |

### Visual Before/After

| Element | Before | After |
|---------|--------|-------|
| Page background | `slate-50 → slate-100` gradient | `zinc-50 → zinc-100` gradient (matches 1team.io) |
| Page title | "OpenMAIC" | "1Team Labs \| AI Interactive Classroom" |
| Top-left branding | None | 1Team logo pill with "Labs" badge |
| Footer | Plain text attribution | Full 1Team-branded footer with logo + copyright |
| Background blobs | `blue-500/10`, `purple-500/10` | `zinc-400/10`, `zinc-500/10` |
| Browser tab | "OpenMAIC" | "1Team Labs \| AI Interactive Classroom" |

---

## 4. UX Improvements Recommended

See `/labs/training-ux/ux-recommendations.md` for full details.

### Summary of Key Issues
| Area | Key Issue | Priority |
|------|-----------|----------|
| Navigation | No back-navigation inside classrooms | High |
| Lesson nav | No keyboard shortcuts (← →) | Medium |
| Module progression | No completion state or progress persistence | High |
| Onboarding | Setup barrier before first value | High |
| Dashboard | Recent classrooms as collapsible, no search | Medium |
| Progress tracking | No persistence across sessions | High |
| Mobile | Classroom layout likely breaks on mobile | High |

### Top 3 High-Impact UX Wins
1. **Add scene progress persistence** — resume classrooms where you left off
2. **Welcome flow for new users** — guided setup wizard instead of toast warning
3. **Classroom back-navigation** — always show "← My Classrooms" in classroom view

---

## 5. Landing Site Improvement Suggestions

See `/1team.io/docs/` for full documentation.

### Design System
- Extract implicit zinc palette into CSS custom properties for maintainability
- Remove framer-motion dependency (only used for mobile drawer) — saves ~45KB
- Register all GSAP plugins in one place (`GSAPProvider.tsx`) instead of per-component

### Components
- Extract `StatBlock`, `ServiceCard`, `TestimonialCard`, `ProcessStep` as reusable components
- Add `size` prop to `Button`, optional `description` to `SectionHeading`
- Create a shared `ThemeToggle` component

### Accessibility
- Add skip-to-main link
- Fix mobile drawer ARIA attributes (no `aria-modal`, no focus trap)
- Fix GSAP `opacity-0` in JSX — move to `gsap.set()` instead
- Add `<ul>`/`<li>` structure to navbar links
- Audit contact form labels

### Performance
- Replace framer-motion with GSAP/CSS for mobile drawer
- Add `next.config.ts` with AVIF/WebP image formats
- Convert logo to WebP format
- Use `visibility: hidden` instead of `opacity: 0` for GSAP initial states (reduces CLS)

---

## 6. Architecture Recommendations for Future Expansion

### Shared Design Package (Recommended for Scale)
As the 1Team product ecosystem grows (1team.io, labs.1team.io, potential future products), extract the design system into a shared package:

```
packages/
  @1team/design-tokens/
    colors.css          — CSS custom properties
    typography.css      — Font variables
    tailwind-preset.ts  — Tailwind config extension
    components/         — Shared React components
      Button.tsx
      Card.tsx
      SectionHeading.tsx
      Navbar.tsx
      Footer.tsx
```

Both projects consume: `import { Button, Footer } from '@1team/design-tokens'`

### Monorepo Structure (Long-term)
```
1team-ecosystem/
  apps/
    1team-io/           — Marketing site (current ./1team.io)
    labs/               — Training portal (current ./labs)
  packages/
    ui/                 — Shared component library
    tokens/             — Design tokens
    config/             — Shared Tailwind/ESLint/TS config
```

Tools: Turborepo or pnpm workspaces for build coordination.

### Sub-product Pattern
For any future 1Team sub-products (e.g., `hire.1team.io`, `tools.1team.io`):
1. Install the `@1team/ui` package
2. Use the `Shell` + `Navbar` + `Footer` components
3. Override only product-specific content (nav links, CTAs, tagline)
4. Inherit all visual identity automatically

This ensures the entire 1Team product ecosystem maintains a consistent visual identity without code duplication.

---

## File Index

```
./labs/
  design-system/
    brand-tokens.md
    typography.md
    layout-system.md
    component-patterns.md
    navigation.md
    footer.md
    assets.md
  ui/
    tokens/colors.css
    tokens/typography.css
    layout/Shell.tsx
    layout/Container.tsx
    layout/Section.tsx
    header/Navbar.tsx
    footer/Footer.tsx
    buttons/Button.tsx
    cards/Card.tsx
    typography/SectionHeading.tsx
    index.ts
  training-ux/
    ux-recommendations.md
    information-architecture.md
  design-system-report.md        ← This file

./1team.io/
  docs/
    design-system-recommendations.md
    component-standardization.md
    accessibility-review.md
    performance-review.md
  public/logo/
    1team-logo.png               (also copied to ./labs/public/logo/)
```
