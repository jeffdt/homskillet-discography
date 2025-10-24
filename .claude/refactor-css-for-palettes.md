# Refactor CSS for Easy Palette Swaps

## Context

The application currently uses a theme system with `[data-theme="msdos"]` selectors throughout `src/index.css`. While this works, it's not structured optimally for adding new color palettes.

## Current Problems

1. **Multiple theme blocks scattered throughout**: There are 18+ instances of `[data-theme="msdos"]` selectors in index.css
2. **Mixed concerns**: Theme-specific blocks contain both color variables AND structural styles (fonts, animations, focus states, etc.)
3. **Not DRY for palette swaps**: Adding a new color palette would require duplicating all 18+ blocks, even though most palettes only need color changes

## Current Structure Example

```css
/* Color variables */
[data-theme="msdos"] {
    --clickable:  #ff0;
    --active:     #800;
    --button:     #66d;
    --selected:   #00f;
    --background: #008;
    /* ... */
}

/* Font settings mixed in */
[data-theme="msdos"] {
    --font: var(--fontPxPlusChipPlayer);
    /* ... */
}

/* Focus states theme-scoped */
[data-theme="msdos"] a:focus,
[data-theme="msdos"] button:focus,
[data-theme="msdos"] select:focus {
    outline: none;
    background-color: var(--focus);
}

/* Scrollbar styling theme-scoped */
[data-theme="msdos"] ::-webkit-scrollbar {
    /* ... */
}

/* And 14+ more [data-theme="msdos"] blocks... */
```

## Desired Structure

```css
/* ============================================
   THEME PALETTE DEFINITIONS (colors only)
   ============================================ */

[data-theme="msdos"] {
    --clickable:  #ff0;
    --active:     #800;
    --button:     #66d;
    --selected:   #00f;
    --focus:      #00f;
    --background: #008;
    --shadow:     #005;
    --neutral0:   #000;
    --neutral1:   #777;
    --neutral2:   #aaa;
    --neutral3:   #ccc;
    --neutral4:   #fff;
}

/* Future palettes go here - just colors! */
[data-theme="metallic-wing"] {
    --clickable:  #00ffff;
    --active:     #ff00ff;
    --button:     #333;
    /* ... etc */
}

/* ============================================
   GLOBAL STYLES (theme-agnostic)
   Everything below uses the color variables
   ============================================ */

/* No more [data-theme] wrappers needed */
a:focus,
button:focus,
select:focus {
    outline: none;
    background-color: var(--focus);
}

body {
    background: var(--background);
    color: var(--neutral2);
}

::-webkit-scrollbar {
    /* uses color variables */
}
```

## The Task

Refactor `src/index.css` to make color palette swaps trivial:

1. **Consolidate color variables**: Move all color-related CSS custom properties into a single `[data-theme="msdos"]` block at the top of the file

2. **Separate theme-agnostic styles**: Remove `[data-theme="msdos"]` selectors from rules that don't need to change between color palettes:
   - Focus states (they use `var(--focus)` which is palette-defined)
   - Scrollbar styling (uses color variables)
   - Layout/structural styles
   - Animation definitions
   - Font sizes and spacing

3. **Keep theme-specific only when necessary**: Only keep `[data-theme="msdos"]` on things that genuinely differ between themes:
   - Possibly font choices (if different themes use different fonts)
   - Possibly animation speeds/styles (if themes have different personalities)

4. **Test**: Ensure the application looks identical after refactoring

## Expected Outcome

After this refactor:
- Adding a new color palette = creating ONE new `[data-theme="newname"]` block with ~10-15 color variables
- No need to duplicate the other 17+ theme blocks
- Easy to see at a glance what colors a theme uses
- Clean separation between "what colors to use" and "how to apply them"

## Files to Modify

- `src/index.css` - Main refactoring target (currently ~750+ lines)

## Files That Should NOT Need Changes

- `src/components/ThemeInitializer.js` - Currently sets `data-theme="msdos"`, will work fine after refactor
- All React components - They don't reference theme names directly

## Success Criteria

1. Application looks identical to before (MS-DOS blue theme)
2. Only ONE `[data-theme="msdos"]` block (or minimal blocks if fonts/animations need to be theme-specific)
3. Can add a new palette by just adding one new color variable block
4. All other CSS is theme-agnostic and references the color variables
