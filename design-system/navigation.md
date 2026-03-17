# 1Team Navigation System

## Navbar Overview

The navbar is a **fixed, floating pill** that transitions from transparent to frosted glass on scroll.

---

## Structure

```
[Fixed Header: full width, z-50]
  [Pill Nav: max-w-7xl, mx-auto, rounded-full]
    [Logo Pill]  [Nav Links (desktop)]  [Theme Toggle + CTA Button]
    [Hamburger (mobile)]
```

---

## Scroll Behavior

| State | Border | Background |
|-------|--------|-----------|
| At top | `border-transparent` | `bg-transparent` |
| Scrolled > 12px | `border-zinc-300/70` | `bg-white/80 backdrop-blur-xl` |
| Dark scrolled | `border-zinc-700/70` | `bg-zinc-950/75 backdrop-blur-xl` |

```tsx
const [scrolled, setScrolled] = useState(false);
useEffect(() => {
  const onScroll = () => setScrolled(window.scrollY > 12);
  window.addEventListener("scroll", onScroll);
  return () => window.removeEventListener("scroll", onScroll);
}, []);
```

---

## Logo

Wrapped in a white pill to ensure visibility on any background:

```tsx
<a href="#" className="flex items-center gap-2 rounded-full bg-white px-3 py-1 dark:bg-zinc-100">
  <Image src="/logo/1team-logo.png" alt="1Team Technologies" width={96} height={28} className="h-6 w-auto" />
</a>
```

---

## Desktop Nav Links

```tsx
const links = [
  ["Services", "#services"],
  ["AI Solutions", "#ai-solutions"],
  ["About", "#about"],
  ["Work", "#work"],
  ["Process", "#process"],
  ["Contact", "#contact"]
];

// Rendered as:
<div className="hidden items-center gap-6 md:flex">
  {links.map(([label, href]) => (
    <a key={href} href={href}
       className="text-sm text-zinc-700 transition hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50">
      {label}
    </a>
  ))}
</div>
```

---

## Desktop Actions (right side)

```tsx
<div className="hidden items-center gap-3 md:flex">
  {/* Theme toggle */}
  <button className="rounded-full border border-zinc-300 p-2 text-zinc-700 dark:border-zinc-700 dark:text-zinc-200">
    <Sun size={16} /> / <Moon size={16} />
  </button>
  {/* CTA */}
  <Button onClick={() => window.location.href = "#contact"}>Start a Project</Button>
</div>
```

---

## Mobile Drawer

Triggered by hamburger icon. Slides in from right using framer-motion.

```tsx
// Trigger button (mobile only)
<button className="rounded-full border border-zinc-300 p-2 md:hidden dark:border-zinc-700">
  <Menu size={18} />
</button>

// Drawer
<motion.aside
  initial={{ x: "100%" }}
  animate={{ x: 0 }}
  exit={{ x: "100%" }}
  transition={{ duration: 0.3 }}
  className="fixed inset-y-0 right-0 w-72 border-l border-zinc-300 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-950"
>
  <button onClick={close} className="mb-8 ml-auto block"><X /></button>
  {/* Links + theme toggle + CTA */}
</motion.aside>
```

---

## Entrance Animation

GSAP animates the navbar on load:
1. Navbar fades in from `y: -20` (100ms delay)
2. Nav links stagger in from `y: -10` with 0.08s stagger (300ms delay)

---

## Training Portal Adaptation

For labs.1team.io, adapt with:

```tsx
const links = [
  ["Classrooms", "/"],
  ["Settings", "#settings"],
];

// Add "back to 1Team" external link
<a href="https://1team.io" className="...">← 1Team.io</a>
```

The visual style (pill shape, zinc colors, frosted glass) remains identical.
