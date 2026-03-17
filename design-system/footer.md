# 1Team Footer System

## Structure

```
[Footer: border-t, py-16]
  [Grid: max-w-7xl, 4 columns on md+]
    [Col 1: Brand]     [Col 2: Services]    [Col 3: AI Solutions]   [Col 4: Resources]
  [Copyright bar: max-w-7xl, mt-10]
```

---

## Full Implementation

```tsx
<footer className="border-t border-zinc-200 px-4 py-16 dark:border-zinc-800">
  <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-4">

    {/* Column 1: Brand */}
    <div className="footer-column">
      <div className="inline-flex rounded-full bg-white px-3 py-1 dark:bg-zinc-100">
        <Image src="/logo/1team-logo.png" alt="1Team" width={90} height={26} className="h-6 w-auto" />
      </div>
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        Engineering Software. Enabling AI. Empowering Business.
      </p>
    </div>

    {/* Column 2: Services */}
    <div className="footer-column">
      <h4 className="font-semibold">Services</h4>
      <ul className="mt-3 space-y-2 text-sm text-zinc-500">
        <li>Software Development</li>
        <li>Cloud & DevOps</li>
        <li>Mobile Engineering</li>
      </ul>
    </div>

    {/* Column 3: AI Solutions */}
    <div className="footer-column">
      <h4 className="font-semibold">AI Solutions</h4>
      <ul className="mt-3 space-y-2 text-sm text-zinc-500">
        <li>AI Strategy</li>
        <li>Custom AI Development</li>
        <li>AI Infrastructure</li>
      </ul>
    </div>

    {/* Column 4: Resources / Newsletter */}
    <div className="footer-column">
      <h4 className="font-semibold">Resources</h4>
      <input
        placeholder="Join newsletter"
        className="mt-3 w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
      />
      <p className="mt-4 text-xs text-zinc-500">Built with ❤️ by 1Team Technologies</p>
    </div>

  </div>
  <p className="copyright mx-auto mt-10 max-w-7xl text-xs text-zinc-500">
    © {new Date().getFullYear()} 1Team Technologies. All rights reserved.
  </p>
</footer>
```

---

## Animation

GSAP fade-up on scroll (using ScrollTrigger):
- Each `.footer-column` fades up from `y:30, opacity:0` with 0.1s stagger
- Copyright fades in with 0.4s delay
- Trigger: `top 90%` of footer entering viewport, `once: true`

---

## Training Portal Footer Adaptation

For labs.1team.io, adapt columns to:

| Col 1 | Col 2 | Col 3 | Col 4 |
|-------|-------|-------|-------|
| 1Team Labs branding | Platform links | Support/docs | Back to 1team.io |

Tagline: *"AI-powered interactive learning by 1Team Technologies."*

Keep the same visual structure: 4-col grid, zinc typography, logo pill, copyright bar.
