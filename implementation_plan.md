# Theme Switcher Implementation Plan

## User Review Required
> [!IMPORTANT]
> This change involves modifying `app.html` to inject a script for preventing Flash of Incorrect Theme (FOIT). This is a standard practice but modifies the root template.

## Proposed Changes

### Configuration
#### [MODIFY] [tailwind.config.ts](file:///home/darksidr/projects/news/tailwind.config.ts)
- Add `darkMode: 'class'` to enable manual theme toggling.

### Root Template
#### [MODIFY] [app.html](file:///home/darksidr/projects/news/src/app.html)
- Remove `class="dark"` from `<html>` tag.
- Add an inline script in `<head>` to:
    - Check `localStorage.getItem('theme')`.
    - If not found, check `window.matchMedia('(prefers-color-scheme: dark)').matches`.
    - Add or remove `'dark'` class from `document.documentElement` accordingly.

### Components
#### [NEW] [ThemeToggle.svelte](file:///home/darksidr/projects/news/src/lib/components/ThemeToggle.svelte)
- Create a button component.
- Icons: Sun (for light mode) and Moon (for dark mode) using `lucide-svelte`.
- Logic:
    - `toggleTheme` function.
    - Use `document.startViewTransition` (if supported).
    - **Animation Strategy**: Always animate the NEW view (`::view-transition-new(root)`) expanding from the click coordinates. This avoids z-index issues and ensures smooth transitions in both directions.
    - Update `localStorage` and `document.documentElement.classList`.

### Pages
#### [MODIFY] [+page.svelte](file:///home/darksidr/projects/news/src/routes/+page.svelte)
- Import `ThemeToggle`.
- Add it to the `<header>` section (top right, replacing or next to the 'Updated' text).

## Verification Plan

### Automated Tests
- None (UI interaction test requires more complex setup than current scope).

### Manual Verification
1.  **Initial Load**:
    - Clear `localStorage` (or open Incognito).
    - Verify the theme matches the system preference.
2.  **Toggling**:
    - Click the toggle button.
    - Verify the theme changes (colors invert).
    - Verify the icon changes.
    - **Verify the animation** (circular reveal effect).
3.  **Persistence**:
    - Reload the page.
    - Verify the selected theme is remembered.
