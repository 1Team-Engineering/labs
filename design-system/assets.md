# 1Team Assets

## Logo

### Primary Logo
- **File**: `/public/logo/1team-logo.png` (in 1team.io)
- **Dimensions**: 560×160px source, displayed at `h-6 w-auto` (24px height) in navbar
- **Format**: PNG with transparency
- **Display context**: Always on white/light background or in white pill wrapper

### Logo Usage Rules
1. Always wrap in a `rounded-full bg-white px-3 py-1` pill on colored/dark backgrounds
2. In dark mode, pill uses `dark:bg-zinc-100` (not pure white — slight warmth)
3. Never display directly on dark background without the white pill
4. Navbar logo: `width={96} height={28}` (display props), `h-6 w-auto` CSS
5. Footer logo: `width={90} height={26}` (display props), `h-6 w-auto` CSS

### Logo in Labs
Copy `/Users/kaipobatoon/projects/1team.io/public/logo/1team-logo.png` into labs public folder:
```
/Users/kaipobatoon/projects/labs/public/logo/1team-logo.png
```

---

## Icon Library

1team.io uses **lucide-react** for all icons:

```tsx
import { Menu, Moon, Sun, X } from "lucide-react";
// Used sizes: 16px (theme toggle), 18px (hamburger)
```

The labs project also uses lucide-react — fully compatible.

Common icons in use:
| Icon | Usage |
|------|-------|
| `Menu` (18px) | Mobile hamburger |
| `X` (default) | Close mobile drawer |
| `Moon` (16px) | Dark mode toggle |
| `Sun` (16px) | Light mode toggle |

---

## Illustrations / Graphics

No custom illustrations in 1team.io — design relies on:
1. **Typography** as the primary visual element
2. **Zinc gradient backgrounds** (radial + linear)
3. **Grid overlay pattern** (64×64px dotted grid)
4. **Drop shadows** on logo

---

## Background Patterns

### Hero Grid
```css
background:
  linear-gradient(rgba(120,120,120,0.12) 1px, transparent 1px),
  linear-gradient(90deg, rgba(120,120,120,0.12) 1px, transparent 1px);
background-size: 64px 64px;
mask-image: radial-gradient(ellipse at center, black 40%, transparent 75%);
```

### Hero Radial Ambient
```css
background:
  radial-gradient(circle at 20% 20%, rgba(120,120,120,0.16), transparent 40%),
  radial-gradient(circle at 80% 30%, rgba(100,100,100,0.14), transparent 42%),
  linear-gradient(to bottom, transparent, rgba(120,120,120,0.08));
```

---

## Favicon

No custom favicon documented — uses Next.js default. Recommendation: create a favicon from the 1Team logo mark.

---

## Animation Assets

No Lottie or video assets. All animations are:
- **GSAP** (scroll reveals, entrance animations, parallax)
- **CSS transitions** (`transition-all`, `transition-colors duration-300`)
- **framer-motion** (mobile drawer slide)

---

## Labs-Specific Assets

For the training portal, additional assets needed:
- [ ] `apple-icon.png` — already in `/labs/app/`
- [ ] `favicon.ico` — already in `/labs/app/`
- [ ] 1Team logo copy for footer/navbar
