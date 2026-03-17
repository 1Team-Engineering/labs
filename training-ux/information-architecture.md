# Training Portal — Information Architecture

## Proposed Sitemap

```
labs.1team.io/
├── / (Home)
│   ├── Hero: Create new classroom (textarea + generate button)
│   └── Recent Classrooms (collapsible grid)
│
├── /classrooms (Classroom Dashboard)
│   ├── Grid of all classrooms
│   ├── Search + filter
│   └── Statistics summary
│
├── /classroom/[id] (Classroom Experience)
│   ├── Scene sidebar (left)
│   ├── Canvas area (center)
│   └── Roundtable panel (right/bottom)
│
├── /generation-preview (Generation in progress)
│   └── Real-time generation progress UI
│
└── Settings (modal overlay, accessible from any page)
    ├── AI Model
    ├── PDF Provider
    ├── Image Provider
    ├── Video Provider
    ├── TTS/ASR
    └── Profile
```

---

## User Journey Flows

### New User Flow
```
Land on /
  → See "Setup needed" badge
  → Click Settings → Complete setup wizard
  → Return to /
  → Enter topic in textarea
  → Click "Enter Classroom"
  → /generation-preview (watching real-time generation)
  → /classroom/[id] (immersive learning)
  → Complete all scenes → Completion screen
  → Return to / or /classrooms
```

### Returning User Flow
```
Land on /
  → See recent classrooms
  → Click "Continue" on existing classroom → /classroom/[id] at last scene
  OR
  → Create new classroom → same flow as new user
```

### Quick Create Flow
```
Land on /
  → Model already configured
  → Type topic → Click "Enter Classroom"
  → /generation-preview → /classroom/[id]
```

---

## Navigation Hierarchy

### Primary Navigation (persistent across all pages)
```
[1Team Labs logo] ←────────── links to /

[← Back to 1Team.io]  ←───── external link, top-left
```

### Secondary Navigation (within classroom)
```
[← My Classrooms]  [Classroom Title]  [Progress: 4/12]
```

### Tertiary Navigation (scene-level)
```
[← Prev Scene]  [Scene indicator dots]  [Next Scene →]
[Scene List sidebar: collapsible]
```

---

## Content Hierarchy

### Home Page
1. Logo + branding (establishes context)
2. Create classroom input (primary action)
3. Recent classrooms (secondary — returning users)
4. Footer (brand + links)

### Classroom Dashboard
1. Stats summary (motivation)
2. Search + filter bar
3. Classroom grid
4. Empty state (new users)

### Classroom Experience
1. Scene title + progress indicator (orientation)
2. Canvas (primary content)
3. Scene navigation controls (primary action)
4. Roundtable / discussion panel (secondary)
5. Settings/menu (tertiary)
