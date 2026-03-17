# 1Team Component Patterns

## Button

Two variants: `primary` (default) and `ghost`.

```tsx
// Primary
<button className="rounded-full border border-zinc-900 bg-zinc-900 text-white
  px-6 py-3 text-sm font-semibold transition-all
  hover:bg-zinc-700
  dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-300
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
  disabled:cursor-not-allowed disabled:opacity-50" />

// Ghost
<button className="rounded-full border border-zinc-400 bg-transparent text-zinc-900
  px-6 py-3 text-sm font-semibold transition-all
  hover:border-zinc-900
  dark:border-zinc-700 dark:text-zinc-100 dark:hover:border-zinc-100
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2" />
```

**Key traits:**
- Always `rounded-full` (pill shape)
- Fixed padding: `px-6 py-3`
- Font: `text-sm font-semibold`
- `transition-all` for smooth hover

---

## SectionHeading

```tsx
<div className="mx-auto max-w-3xl text-center">
  {/* Optional eyebrow */}
  <p className="mb-3 text-xs uppercase tracking-[0.3em] text-zinc-500">
    {eyebrow}
  </p>
  <h2 className="text-3xl font-semibold tracking-tight text-zinc-950 md:text-5xl dark:text-zinc-50">
    {title}
  </h2>
  <p className="mt-4 text-base text-zinc-600 md:text-lg dark:text-zinc-300">
    {description}
  </p>
</div>
```

**Usage:** Opens every major section. Eyebrow is optional.

---

## Card

No dedicated Card component in 1team.io — cards are inline. Inferred pattern:

```tsx
<div className="rounded-2xl border border-zinc-200 bg-white p-6
  transition-all hover:border-zinc-300 hover:shadow-sm
  dark:border-zinc-800 dark:bg-zinc-900">
  {children}
</div>
```

---

## Badge / Tag

Inferred from eyebrow and pill patterns:

```tsx
// Inline badge
<span className="rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1
  text-xs font-medium text-zinc-600
  dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
  {label}
</span>
```

---

## Link / Nav Item

```tsx
// Navigation link
<a className="text-sm text-zinc-700 transition hover:text-zinc-950
  dark:text-zinc-300 dark:hover:text-zinc-50">
  {label}
</a>

// Footer link (static, no hover in current impl)
<li className="text-sm text-zinc-500">{label}</li>
```

---

## Form Input

Inferred from footer newsletter input:

```tsx
<input
  className="w-full rounded-lg border border-zinc-300 bg-transparent
    px-3 py-2 text-sm
    placeholder:text-zinc-400
    focus:outline-none focus:ring-2 focus:ring-zinc-900
    dark:border-zinc-700 dark:text-zinc-100"
/>
```

---

## CTA Section Pattern

Recurring pattern across sections:

```tsx
<section className="px-4 py-24">
  <div className="mx-auto max-w-7xl">
    <SectionHeading eyebrow="..." title="..." description="..." />
    <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
      <Button>Primary CTA</Button>
      <Button variant="ghost">Secondary CTA</Button>
    </div>
  </div>
</section>
```

---

## Logo Pill

Consistent pattern for the 1Team logo:

```tsx
<div className="inline-flex rounded-full bg-white px-3 py-1 dark:bg-zinc-100">
  <Image
    src="/logo/1team-logo.png"
    alt="1Team Technologies"
    width={96}
    height={28}
    className="h-6 w-auto"
  />
</div>
```

---

## Testimonial / Quote Block

```tsx
<blockquote className="rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
  <p className="text-zinc-600 dark:text-zinc-300">{quote}</p>
  <footer className="mt-4">
    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{author}</p>
    <p className="text-sm text-zinc-500">{role}</p>
  </footer>
</blockquote>
```

---

## Scroll Reveal Animation Pattern

Applied to sections via GSAP:

```tsx
// Typical scroll trigger animation
gsap.fromTo(
  element,
  { opacity: 0, y: 60 },
  {
    opacity: 1, y: 0,
    duration: 0.6,
    ease: "power3.out",
    scrollTrigger: { trigger: element, start: "top 85%", once: true }
  }
);

// Card stagger reveal
gsap.fromTo(cards, { opacity: 0, y: 80, scale: 0.95 }, {
  opacity: 1, y: 0, scale: 1,
  duration: 1.0,
  ease: "power3.out",
  stagger: 0.08,
  scrollTrigger: { ... }
});
```

**Note:** All GSAP animations respect `prefers-reduced-motion` via `prefersReducedMotion()` check.
