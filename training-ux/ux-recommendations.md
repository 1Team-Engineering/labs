# Training Portal UX Recommendations

## Overview

The labs.1team.io training portal (OpenMAIC) is an AI-powered interactive classroom generator. Users provide a topic/PDF and an AI generates a multi-agent immersive learning experience.

This document covers UX improvements across 7 areas.

---

## 1. Navigation Structure

### Current State
- Single-page app with no persistent top navigation
- Users navigate via: Home → Generation Preview → Classroom `/[id]`
- No visible back-navigation within the classroom experience
- No breadcrumbs or "where am I" orientation

### Issues
- **No wayfinding**: Users inside a classroom have no clear path back to the home page
- **No URL-based bookmarking**: Classrooms are only visible in "Recent Classrooms" on the home page
- **No persistent nav**: Header-level navigation disappears in classroom mode

### Recommendations
1. **Add a persistent mini-header inside classrooms** with:
   - 1Team Labs logo (links back to home)
   - Classroom title (truncated)
   - "← My Classrooms" back link
   - Progress indicator (`Scene 3 of 12`)

2. **Breadcrumb pattern**: `Labs > Recent Classrooms > [Classroom Title]`

3. **Add `/classrooms` route** as a dedicated list page (separate from the home page's collapsible section)

---

## 2. Lesson Navigation

### Current State
- Classroom has a `SceneSidebar` component listing scenes
- Navigation within a classroom uses arrow/next controls
- Scene list visible on desktop, unclear on mobile

### Issues
- **No keyboard shortcuts** for scene navigation (← → arrow keys)
- **No scene overview** (users can't see all scenes at once quickly)
- **No scene completion state** (no visual indicator of visited vs unvisited scenes)
- **Scene sidebar is wide** on desktop, eating into canvas space

### Recommendations
1. **Keyboard navigation**: Arrow keys for prev/next scene
2. **Scene progress indicator**: Small dots/steps at the bottom (like a slide deck)
3. **Visited/unvisited states**: Use checkmark or darker color for completed scenes
4. **Collapsible sidebar**: Allow the scene sidebar to collapse to icon-only mode to maximize canvas
5. **Scene jump modal**: `⌘K` or search to jump to any scene by title

---

## 3. Module Progression

### Current State
- Each classroom is a single linear progression of scenes
- No concept of "modules" grouping related scenes
- No explicit completion state

### Issues
- **No hierarchy**: All scenes are flat — no way to group related content
- **No completion milestone**: Users don't know when they've "finished" a classroom
- **No replay / review mode**: Once scenes are completed, hard to revisit key points

### Recommendations
1. **Module grouping**: Allow scenes to be grouped into chapters/modules (e.g., "Introduction", "Core Concepts", "Practice")
2. **Progress bar**: Show overall classroom completion as a progress bar (`45% complete`)
3. **Completion screen**: After the last scene, show a summary/completion screen with key takeaways
4. **Review mode**: Allow users to navigate to any scene without triggering play/generation again
5. **Scene bookmarking**: Let users star/bookmark scenes to revisit

---

## 4. User Onboarding

### Current State
- First-time users land on the home page with a text input and no guidance
- "Setup needed" notification appears if no AI model is configured
- The concept of "AI Interactive Classroom" may not be immediately clear

### Issues
- **No intro/welcome flow**: Users with no model configured are dropped into an error state
- **The input placeholder** is the only guidance on what to type
- **No example classrooms**: New users can't preview what the experience looks like
- **Setup is required before value**: The AI model setup barrier is high for first-time users

### Recommendations
1. **Welcome flow for first-time users**:
   - Simple 3-step onboarding: "Configure AI" → "Create your first classroom" → "Start learning"
   - Show a sample classroom preview (video or screenshots)

2. **Setup wizard**: Instead of a toast, guide users through model setup with a dedicated modal/dialog:
   - Step 1: Choose AI provider
   - Step 2: Add API key
   - Step 3: Test connection
   - Step 4: "You're ready!"

3. **Example prompts**: Below the textarea, show 3-4 example topics users can click to autofill:
   - "Introduction to Machine Learning"
   - "React Hooks explained"
   - "The French Revolution"

4. **Demo classroom**: Provide a pre-generated sample classroom users can explore before configuring anything

---

## 5. Learning Dashboard

### Current State
- Home page has a "Recent Classrooms" collapsible section
- Classrooms shown as a horizontal scroll of thumbnail cards
- Each card shows: thumbnail, title, date

### Issues
- **Collapsible by default** hides classrooms from users who need to find them
- **No search/filter**: With many classrooms, there's no way to find a specific one
- **No progress info on cards**: Cards don't show completion percentage
- **Limited metadata**: No topic tags, duration estimate, or scene count visible

### Recommendations
1. **Dedicated `/classrooms` dashboard page**:
   - Grid layout with richer cards (thumbnail + title + progress + date + scene count)
   - Search bar to filter by title
   - Sort by: Most recent, Alphabetical, Most complete
   - Filter by: Topic, Date created

2. **Enriched classroom cards**:
   ```
   [Thumbnail]
   [Title]
   [Progress bar: 3/10 scenes]
   [Date] [Scene count]
   [Continue →] [Delete]
   ```

3. **Statistics summary**: At the top of the dashboard:
   - "X classrooms created"
   - "X hours of learning"
   - "X scenes completed"

---

## 6. Progress Tracking UI

### Current State
- No persistent progress tracking (progress is lost on browser refresh)
- Scene sidebar shows current scene position
- No visual completion indicators

### Issues
- **No persistence (confirmed in source)**: A code comment explicitly states: *"Playback state persistence removed — refresh always starts from beginning"*
- **No visual language** for completion (no checkmarks, no progress bars)
- **No cross-session continuity**: Re-opening a classroom starts from the beginning
- **No deep-linkable scenes**: `currentSceneId` is Zustand state only, not reflected in the URL — users cannot bookmark or share a specific scene

### Recommendations
1. **Persist scene progress** to IndexedDB per classroom:
   ```ts
   { classroomId: string, scenesViewed: string[], lastScene: string }
   ```

2. **Scene completion indicators** in the sidebar:
   - Unvisited: empty circle `○`
   - In progress: half-filled `◐`
   - Completed: checkmark `✓`

3. **Progress bar** at the top of the classroom:
   ```
   [━━━━━━━━░░░░░░░░░░░░] 4 / 12 scenes  35%
   ```

4. **"Resume" button** on classroom cards that jumps to the last viewed scene

5. **Completion celebration**: A confetti/celebration animation + summary screen when all scenes are viewed

---

## 7. Mobile Usability

### Current State
- Home page uses responsive layout (pt-16 on mobile)
- Classroom experience uses a canvas-based layout — unclear mobile behavior
- The sidebar, canvas, and roundtable panel likely stack poorly on mobile

### Issues
- **Canvas-based classroom** may not be optimized for touch/mobile
- **Scene sidebar** may overlap the canvas on small screens
- **Top-right toolbar pill** may conflict with the 1Team logo pill on narrow viewports
- **Textarea min-height: 140px** is large on mobile, pushing content below the fold

### Recommendations
1. **Mobile classroom layout**:
   - Scene sidebar: Bottom drawer instead of side panel
   - Canvas: Full-width, touch-swipe to navigate scenes
   - Roundtable panel: Collapsible drawer at bottom

2. **Home page mobile**:
   - Reduce textarea min-height to `80px` on mobile
   - Stack the toolbar row vertically on very narrow screens
   - The top-left 1Team logo + top-right toolbar: ensure they don't overlap at 320px

3. **Touch gestures**:
   - Swipe left/right to navigate between scenes
   - Pinch to zoom the canvas

4. **Panel resize — touch support**:
   - The classroom's drag-to-resize panel divider uses mouse-only events
   - Touch devices (iPad, mobile) cannot resize the sidebar/canvas split
   - Fix: add `touchstart`/`touchmove`/`touchend` handlers alongside `mousedown`/`mousemove`/`mouseup`

5. **Deep linking**:
   - Put `currentSceneId` in the URL (`/classroom/[id]?scene=3`) so users can share/bookmark scenes
   - This also enables the browser Back button to navigate between scenes

4. **Mobile performance**:
   - Lazy-load thumbnails in the Recent Classrooms section
   - Avoid loading all classroom data on initial mount
