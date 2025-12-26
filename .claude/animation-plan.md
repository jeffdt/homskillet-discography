# Dynamic Animations Implementation Plan

## 📋 Instructions for Future Agents

**When implementing animations from this plan:**

1. **Mark completed items**: Change `- [ ]` to `- [x]` for main tasks and sub-tasks
2. **Accessibility first**: Test each animation with `prefers-reduced-motion` media query
3. **Maintain aesthetic**: Snap animations to character grid (`--charW1: 8px`, `--charW2: 16px`)
4. **Use existing theme**: Reference CSS variables (`--accent`, `--accent-dark`, `--background`, etc.)
5. **Stay chunky**: Use CSS `steps()` timing functions for retro feel
6. **Audio integration**: Leverage existing `audioCtx` and `playerNode` for reactive features
7. **Iterate and finalize**: Pause to allow me to QA the results and provide feedback. Implement feedback and pause again.
8. **Document learnings**: Add implementation notes below each completed item
8. **Write a haiku**: Reflect on the feature, either the technical implementation or the aesthetic impact it creates, and add a haiku below the completed item.
---

## 🎨 Current Site Aesthetic

**Retro DOS Terminal Style:**
- Monospace font (Nixdorf 8810 M15)
- "Metallic Wing Green" theme: black (#101010) + neon green (#9BFE38, #66CB01)
- Chunky stepped animations already in use (`steps(4)`, `steps(5)`)
- Spectrogram visualizer with multiple color palettes
- Web Audio API integration via `audioCtx` and `playerNode`

**Animation Philosophy**: Make the site feel alive and musical while honoring the 8-bit/NES chip music heritage. Every animation should feel intentional, like a well-timed drum hit or synth sweep.

---

## ✅ Phase 1: High Impact, Low Effort

### - [x] 1. Scanline Sweep Effect
*Inspired by CRT monitors and old TVs*

**What**: Animated scanlines that sweep across the entire interface
**Where**: Background overlay on entire `.App` container
**When**: Constantly running at low opacity, intensifies during playback
**Why**: Creates atmospheric depth and reinforces retro aesthetic

**Implementation Tasks:**
- [x] Add `::before` pseudo-element to `.App` with repeating-linear-gradient
- [x] Create CSS `@keyframes` for vertical scanline movement
- [x] Add class toggle based on `paused` prop to adjust animation speed
- [x] Add `@media (prefers-reduced-motion: reduce)` to disable/slow down
- [ ] Optional: Connect to AudioContext analyzer for amplitude-based intensity
- [x] Test at different viewport sizes

**Files modified:**
- `src/index.css` - Added scanline styles and animation
- `src/components/App.tsx` - Added conditional class (kept for future use)

**Implementation Notes:**

**Design Evolution:**
- Initial approach used `repeating-linear-gradient` which incorrectly painted everything above the sweep with color
- Revised to use single `linear-gradient` creating thin moving lines that don't leave trails
- Tested green vs gray - settled on **white/gray** for more neutral, less distracting effect

**Final Implementation:**
- Two thin scanlines using `::before` and `::after` pseudo-elements
- Line 1: 12s sweep cycle (slower, atmospheric)
- Line 2: 5s sweep cycle (faster, creates varied overlap patterns)
- Line thickness: 0.6% of screen height (49.7% → 50.3%)
- Opacity: Very subtle (0.04 → 0.12) with feathered edges for soft glow
- Color: White (`rgba(255, 255, 255, ...)`) for neutral CRT effect
- Animation: Vertical sweep from `-100%` to `+100%` (fully off-screen transitions)

**Accessibility:**
- `@media (prefers-reduced-motion)` removes animation and hides scanlines entirely
- `pointer-events: none` ensures no interference with UI interactions
- `z-index: 1` for proper layering

**Performance:**
- Pure CSS transforms (GPU-accelerated)
- No JavaScript overhead
- Smooth 60fps animation

**Decision: Removed playback-based speed change**
- Original plan called for faster animation during playback
- Removed after user feedback - doesn't make logical sense
- Scanlines now run at constant speeds regardless of player state
- Kept `is-playing` class in App.tsx for potential future audio-reactive enhancements

**Haiku:**

*Twin beams drift downward*
*Through phosphor memories fade*
*Gray ghosts mark the screen*

---

### - [x] 2. CRT Noise/Grain Filter
*Film grain and static to simulate analog CRT display*

**What**: Subtle animated noise overlay to simulate CRT phosphor grain and analog static
**Where**: Background overlay on entire `.App` container
**When**: Constantly running at low opacity (15%)
**Why**: Enhances CRT authenticity, pairs beautifully with scanlines, adds texture and depth

**Implementation Tasks:**
- [x] Choose implementation approach (Option A: SVG feTurbulence)
- [x] Create inline SVG filter with `<feTurbulence>` in App component
- [x] Apply filter to dedicated overlay div via CSS
- [x] Animate noise seed value for slow drift (8s cycle)
- [x] Ensure `pointer-events: none` to avoid interaction issues
- [x] Test with `prefers-reduced-motion` (disable animation, keep static noise)
- [x] Test at different viewport sizes
- [x] Verify performance (GPU-accelerated)
- [x] Fix z-index stacking to cover all elements
- [x] Remove interfering backgrounds from Browse-topRow and Visualizer

**Files modified:**
- `src/components/App.tsx` - Added inline SVG filter and noise overlay div
- `src/index.css` - Added `.crt-noise-overlay` styles
- `src/components/Browse.tsx` - Restructured to fixed header with scrollable list
- `src/components/VirtualizedList.tsx` - Removed children rendering
- `src/index.css` - Cleaned up Browse layout, removed sticky positioning hack

**Implementation Notes:**

**Chosen Approach: SVG feTurbulence (Option A)**
- Inline SVG with `<feTurbulence>` filter in App.tsx
- `fractalNoise` type with `baseFrequency="0.9"` and `numOctaves="4"`
- Animated using SVG `<animate>` element changing seed from 0 to 100 over 8s

**Final Implementation:**
- Dedicated `<div className="crt-noise-overlay">` with white background
- CSS filter applies `url(#crt-noise)` to the overlay
- `position: fixed` with `inset: 0` to cover entire viewport
- `z-index: 99999` to ensure it sits on top of all content
- `mix-blend-mode: overlay` for authentic film grain effect
- **Opacity: 15%** (0.15) - user preference for visible grain
- `pointer-events: none` to avoid blocking interactions

**Animation:**
- SVG `<animate>` element cycles `seed` attribute 0→100 over 8 seconds
- Creates slow drifting noise pattern like analog TV static
- Smooth continuous loop with `repeatCount="indefinite"`

**Accessibility:**
- `@media (prefers-reduced-motion)` disables animation via CSS
- Static noise remains at slightly lower opacity (2.5%)
- `aria-hidden="true"` on overlay div

**Architecture Improvements:**
- **Removed sticky positioning hack**: Browse-topRow no longer uses `position: sticky` with opaque background
- **Proper layout hierarchy**: Browse component now has fixed header (`Browse-topRow`) with scrollable list (`Browse-list-scroll`) underneath
- **Clean separation**: Only the file list scrolls, header stays static (Windows Explorer pattern)
- **Removed interfering backgrounds**:
  - `.Browse-topRow`: Removed `position: sticky`, `z-index`, and `background`
  - `.Visualizer-options`: Removed `background-color: rgba(0, 0, 0, 0.65)`
- **Better scrolling control**: `.App-main-content-area` no longer scrolls, Browse manages its own scroll area

**Performance:**
- Pure CSS/SVG implementation
- GPU-accelerated via CSS filters and transforms
- No JavaScript overhead
- Smooth 60fps animation
- Minimal DOM impact (single overlay div)

**Visual Impact:**
- Complements dual scanline effect beautifully
- Adds texture and depth to flat UI
- Authentic CRT monitor grain/static feel
- Works across all elements including visualizer and file browser

**Haiku:**

*White noise drifts and shifts*
*Through pixels and phosphor glow*
*Static memory*

---

### - [ ] 3. Chunky Slide-In Animations
*DOS-style transitions with character grid snapping*

**What**: UI elements slide in/out snapped to character grid (8px/16px increments)
**Where**: Song list items, settings panel, modals
**When**: Route changes, list scrolling, panel toggles
**Why**: Maintains chunky DOS aesthetic while adding motion

**Implementation Tasks:**
- [ ] Add CSS class for slide-in animation using `transform: translateY()`
- [ ] Use `steps(10)` or similar for chunky movement
- [ ] Snap to `--charW1` (8px) or `--charW2` (16px) increments
- [ ] Apply to `.BrowseList-row` components on mount
- [ ] Add stagger delay for list items (e.g., `animation-delay: calc(var(--index) * 50ms)`)
- [ ] Test with `prefers-reduced-motion`

**Files to modify:**
- `src/index.css` - Add slide-in animation keyframes
- `src/components/Browse.tsx` - Apply animation classes to list items
- `src/components/Settings.tsx` - Add slide-in for settings panel

**Implementation Notes:**
<!-- Add notes here after implementation -->

---

### - [ ] 4. Pixelated Hover States
*Retro game sprite-style hover effects*

**What**: Items scale up in chunky pixel increments on hover
**Where**: Buttons, file list items, controls
**When**: Hover/focus states
**Why**: Tactile feedback that matches aesthetic

**Implementation Tasks:**
- [ ] Add hover styles to `.box-button:hover` with `transform: scale()` and `steps(3)`
- [ ] Scale from 1.0 to 1.05 or 1.1
- [ ] Add hover styles to `.BrowseList-row:hover`
- [ ] Optional: Add "marching ants" border animation using dashed borders
- [ ] Ensure focus states are accessible (keyboard navigation)
- [ ] Test with `prefers-reduced-motion`

**Files to modify:**
- `src/index.css` - Add hover animation styles

**Implementation Notes:**
<!-- Add notes here after implementation -->

---

### - [ ] 5. Convex CRT Screen Filter
*Curved screen effect like classic CRT monitors*

**What**: CSS-based screen curvature and vignette to simulate convex CRT display
**Where**: Applied to entire `.App` container
**When**: Always active (static effect)
**Why**: Enhances retro CRT monitor aesthetic, adds depth and authenticity

**Implementation Approaches (choose one or combine):**

**Option A: Transform + Perspective (Subtle)**
- Use CSS 3D transforms for gentle bulge effect
- `perspective` + `rotateX/rotateY` for convex curve
- Pros: Simple, performant, subtle
- Cons: May not be noticeable enough

**Option B: Radial Gradient Vignette (Classic)**
- Darkened edges with radial gradient overlay
- Simulates CRT tube edge darkness
- Pros: Very simple, authentic look
- Cons: No actual geometry distortion

**Option C: Transform + Perspective + Scale (Moderate)**
- Combines 3D transform with scaling
- More pronounced curve than Option A
- Pros: Noticeable curve, still performant
- Cons: Can distort text if too aggressive

**Option D: SVG Filter Displacement Map (Advanced)**
- True barrel distortion using SVG filters
- Most realistic CRT curve simulation
- Pros: Most authentic, adjustable distortion
- Cons: More complex, potential performance impact

**Option E: Combined Approach (Recommended)**
- Subtle 3D transform for curve
- Radial vignette for edge darkening
- Optional: Slight chromatic aberration at edges (RGB split)
- Pairs beautifully with scanline effect (#1)
- Pros: Best visual impact, layered authenticity
- Cons: Multiple CSS layers

**Implementation Tasks:**
- [ ] Choose implementation approach (A, B, C, D, or E)
- [ ] Add CSS pseudo-elements to `.App` for CRT effect layers
- [ ] Implement chosen curvature technique
- [ ] Add edge vignette (dark corners/edges)
- [ ] Optional: Add subtle chromatic aberration at screen edges
- [ ] Test with `prefers-reduced-motion` (static effect, but should respect preference)
- [ ] Ensure text remains readable (adjust intensity if needed)
- [ ] Test at different viewport sizes and aspect ratios

**Example CSS for Option E (Combined):**
```css
.App {
  perspective: 500px;
  transform: perspective(500px) rotateX(0.5deg);
  overflow: hidden;
}

/* Vignette overlay */
.App::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 100% 100% at center,
    transparent 30%,
    rgba(0,0,0,0.15) 80%,
    rgba(0,0,0,0.5) 100%
  );
  pointer-events: none;
  z-index: 9998;
}

/* Optional: Screen edge curve */
.App::after {
  content: '';
  position: absolute;
  inset: -2%;
  border-radius: 3% / 2%;
  box-shadow: inset 0 0 100px rgba(0,0,0,0.5);
  pointer-events: none;
  z-index: 9999;
}
```

**Files to modify:**
- `src/index.css` - Add CRT filter styles

**Implementation Notes:**
<!-- Add notes here after implementation -->
<!-- Document which approach was chosen and any adjustments made -->

---

## 🎵 Phase 2: Musical Responsiveness

### - [ ] 6. Audio-Reactive Border Pulse
*Player controls respond to the music*

**What**: Border/outline pulsing in sync with beat or audio peaks
**Where**: `.AppFooter` player controls, active song in browse list
**When**: During playback
**Why**: Makes the interface feel musically alive

**Implementation Tasks:**
- [ ] Create audio analyzer hook/utility that reads from `playerNode`
- [ ] Map amplitude to box-shadow spread/opacity values
- [ ] Use `requestAnimationFrame` for smooth updates
- [ ] Apply pulsing box-shadow with `--accent` color (#9BFE38)
- [ ] Add to `.AppFooter-play-pause` button
- [ ] Optional: Highlight active song row in browse list
- [ ] Ensure performance is smooth (throttle if needed)

**Files to modify:**
- `src/components/App.tsx` - Pass audio data to components
- `src/components/AppFooter.tsx` - Apply reactive styles
- `src/components/Browse.tsx` - Optional: highlight active song
- `src/index.css` - Base pulse animation styles

**Implementation Notes:**
<!-- Add notes here after implementation -->

---

### - [ ] 7. Visualizer Spectrum Bars Dance
*More theatrical spectrum visualization*

**What**: Enhanced visualizer with overshoot/bounce on peaks
**Where**: Existing Visualizer component
**When**: During playback
**Why**: Makes audio visualization more satisfying and dynamic

**Implementation Tasks:**
- [ ] Review `src/Spectrogram.js` rendering pipeline
- [ ] Add peak hold dots that float up and decay
- [ ] Implement smoothing/interpolation for frequency bars
- [ ] Optional: Add "bloom" effect on peaks using canvas filters
- [ ] Add subtle spring physics to bar movements
- [ ] Ensure performance remains smooth

**Files to modify:**
- `src/Spectrogram.js` - Enhance rendering with peak detection and effects

**Implementation Notes:**
<!-- Add notes here after implementation -->

---

### - [ ] 8. VU Meter Volume Slider
*Volume control styled like classic audio equipment*

**What**: Volume slider with animated LED/segment display
**Where**: Replace or enhance existing `VolumeSlider`
**When**: Volume changes
**Why**: More tactile and musical than plain slider

**Implementation Tasks:**
- [ ] Design segmented LED display (10-12 segments)
- [ ] Light up segments in green based on volume value
- [ ] Add different colors for different ranges (green → yellow → red)
- [ ] Animate the active segment with pulse/glow effect
- [ ] Ensure slider remains accessible (keyboard control, ARIA labels)
- [ ] Test with different volume values

**Files to modify:**
- `src/components/VolumeSlider.tsx` - Redesign with segment display
- `src/index.css` - Add VU meter styling

**Implementation Notes:**
<!-- Add notes here after implementation -->

---

## ✨ Phase 3: Polish & Delight

### - [ ] 9. Pixel Glitch Transitions
*Like corrupted NES graphics or sprite flickering*

**What**: Brief glitch/flicker effects on state changes
**Where**: Track name, play/pause button, visualizer
**When**: Song changes, play/pause toggle, subtune switches
**Why**: Adds personality and feedback without being distracting

**Implementation Tasks:**
- [ ] Create CSS animation with RGB channel shift using `text-shadow`
- [ ] Use CSS filters (hue-rotate, blur, brightness) in rapid succession
- [ ] Very short duration (100-200ms) with `steps(3)` or `steps(4)`
- [ ] Trigger on song change in `SongDisplay` component
- [ ] Trigger on play/pause button click
- [ ] Test with `prefers-reduced-motion`

**Files to modify:**
- `src/index.css` - Add glitch animation keyframes
- `src/components/SongDisplay.tsx` - Trigger on song change
- `src/components/AppFooter.tsx` - Trigger on play/pause

**Implementation Notes:**
<!-- Add notes here after implementation -->

---

### - [ ] 10. Typewriter/Terminal Text Reveal
*Song titles appear like they're being typed in a terminal*

**What**: Character-by-character reveal animation
**Where**: Song titles when changing tracks, album names on load
**When**: Song changes, page navigation
**Why**: Reinforces terminal/DOS aesthetic, creates anticipation

**Implementation Tasks:**
- [ ] Option A: CSS clip-path or mask with stepped animation
- [ ] Option B: JavaScript character reveal with setTimeout
- [ ] Very fast reveal (30-50ms per character)
- [ ] Apply to song title in `SongDisplay`
- [ ] Ensure doesn't slow down UX
- [ ] Test with `prefers-reduced-motion`

**Files to modify:**
- `src/components/SongDisplay.tsx` - Add reveal animation
- `src/index.css` - If using CSS approach, add keyframes

**Implementation Notes:**
<!-- Add notes here after implementation -->

---

### - [ ] 11. Sprite-Sheet Button States
*Buttons change like old game UI sprites*

**What**: Button states (normal, hover, active) swap like sprite frames
**Where**: Play/pause, next/prev, all `.box-button` elements
**When**: State changes
**Why**: Authentic retro game feel

**Implementation Tasks:**
- [ ] Define distinct visual states for normal, hover, and active
- [ ] Use different borders/backgrounds for each state
- [ ] Use `transition: none` for instant state changes (no smooth fade)
- [ ] Add subtle "press down" transform on `:active` state
- [ ] Ensure keyboard focus states are visible
- [ ] Apply to all `.box-button` elements

**Files to modify:**
- `src/index.css` - Update `.box-button` states

**Implementation Notes:**
<!-- Add notes here after implementation -->

---

## 🎨 Phase 4: Optional Enhancements

### - [ ] 12. Loading "Tape Deck" Animation
*Like waiting for a cassette to load a game*

**What**: Retro loading indicator mimicking spinning reels or chunky progress bar
**Where**: When fetching directories or loading songs
**When**: Data loading states
**Why**: Reduces perceived wait time with nostalgic flair

**Implementation Tasks:**
- [ ] Option A: Create spinning cassette reel SVG with CSS animation
- [ ] Option B: Chunky progress bar that fills in blocks
- [ ] Add loading state to `Browse` component during `fetchDirectory()`
- [ ] Position overlay or inline in content area
- [ ] Ensure accessible (ARIA live region for screen readers)
- [ ] Test with slow network throttling

**Files to modify:**
- `src/components/Browse.tsx` - Add loading indicator
- `src/index.css` - Loading animation styles
- Optional: Create new `LoadingIndicator.tsx` component

**Implementation Notes:**
<!-- Add notes here after implementation -->

---

### - [ ] 13. Parallax Depth Layers
*Subtle depth with layered movement*

**What**: Background elements move at different speeds on scroll
**Where**: Browse list scrolling
**When**: User scrolls through song list
**Why**: Adds subtle depth without breaking 2D aesthetic

**Implementation Tasks:**
- [ ] Add scroll event listener to browse area
- [ ] Apply `transform: translateY()` to header/footer at 0.9x scroll speed
- [ ] Keep effect very subtle to avoid motion sickness
- [ ] Debounce/throttle scroll handler for performance
- [ ] Test with `prefers-reduced-motion`
- [ ] Ensure doesn't interfere with scroll restoration

**Files to modify:**
- `src/components/Browse.tsx` - Add scroll handler
- `src/components/AppHeader.tsx` - Apply parallax transform
- `src/components/AppFooter.tsx` - Apply parallax transform

**Implementation Notes:**
<!-- Add notes here after implementation -->

---

### - [ ] 14. Cursor Trail Effect
*Retro cursor with pixel trail*

**What**: Custom cursor with trailing pixels
**Where**: Entire app
**When**: Mouse movement
**Why**: Immersive retro computing experience

**Implementation Tasks:**
- [ ] Create custom 8x8 or 16x16 pixel cursor sprite
- [ ] Apply custom cursor with `cursor: url()` CSS
- [ ] Optional: Add JavaScript trail particles that fade out
- [ ] Make toggleable in Settings (user preference)
- [ ] Ensure doesn't impact performance
- [ ] Test with `prefers-reduced-motion`

**Files to modify:**
- `src/index.css` - Custom cursor styles
- Optional: Create `CursorTrail.tsx` component for trail effect
- `src/components/Settings.tsx` - Add toggle option

**Implementation Notes:**
<!-- Add notes here after implementation -->

---

### - [x] 15. Slider Knob Pixel Sparks
*Chunky pixel particles trailing the time slider knob*

**What**: Small pixel sparks fly off the slider knob as it moves during playback
**Where**: TimeSlider component's slider knob (`.Slider-knob`)
**When**: During playback as the knob advances
**Why**: Adds dynamic energy to playback visualization, makes the passage of time feel more exciting

**Implementation Tasks:**
- [x] Create particle system that spawns chunky pixel sparks from slider knob position
- [x] Particles should fly outward/upward and fade out
- [x] Use canvas overlay or CSS positioned elements for particles
- [x] Spawn rate tied to playback state (only during playback, not when dragging)
- [x] Keep particle count low for performance (3-5 active particles max)
- [x] Particles should be 2x2 or 4x4 pixel blocks (chunky aesthetic)
- [x] Use `--accent` color (#9BFE38) with slight hue variation
- [x] Stepped/chunky movement using CSS `steps()` or discrete position updates
- [x] Test with `prefers-reduced-motion` (disable particles entirely)
- [x] Ensure doesn't interfere with slider interaction

**Files modified:**
- `src/components/SliderParticles.tsx` - Created new particle component
- `src/components/Slider.tsx` - Integrated particle system, added progress bar visualization
- `src/components/TimeSlider.tsx` - Pass shouldSpawnParticles prop
- `src/index.css` - Added particle animations and redesigned slider appearance

**Implementation Notes:**

**Chosen Approach: React Particle Component (Option C)**
- Created dedicated `SliderParticles.tsx` component
- Renders positioned `<div>` elements for each particle
- Integrates cleanly with React lifecycle for spawn/cleanup

**Particle System Architecture:**
- **Dual independent spawners**: 2 separate spawners run simultaneously with random intervals
- **Random spawn timing**: Each spawner waits 40-120ms (randomized) between spawns
- **Organic clustering**: Dual spawners create natural bursts when they fire simultaneously
- **Max particles**: 15 active particles at once
- **Particle lifetime**: 600ms before removal

**Particle Physics:**
- **Velocity randomization**:
  - Horizontal (vx): -0.4 to -1.5 (leftward, wide speed variation)
  - Vertical (vy): -1.1 to 0.9 (slight upward bias to compensate for gravity)
- **Gravity simulation**: CSS keyframes add progressive downward acceleration
  - Midpoint (50%): +10px downward
  - Endpoint (100%): +40px downward
- **Travel distance**: 80px horizontal, with parabolic arc
- **Direction**: Particles fly LEFT (backward) like sparks being carved off as slider advances right

**Visual Design:**
- **Size**: 2x2px blocks (retro chunky aesthetic)
- **Color**: Bright green (`--accent` #9BFE38) with 0-30° hue variation
- **Animation**: steps(20) for high frame rate chunky motion (600ms duration)
- **No fade**: Particles stay full opacity then disappear instantly (retro feel)
- **Accessibility**: `@media (prefers-reduced-motion)` disables particles entirely

**Slider Redesign (Bonus Enhancement):**
The slider was completely redesigned during this implementation to enhance the "carving" metaphor:

- **Progress Bar Style**: Replaced vertical knob marker with horizontal fill
  - Gray rail (`#7F7F7F`): Unplayed portion
  - Dark green fill (`--accent-dark` #66CB01): Played portion
  - Bright green arrowhead (`--accent` #9BFE38): Leading edge "chisel"

- **Arrowhead Design**:
  - Right-pointing chevron created with CSS borders
  - Size: 4px wide × 3px tall (matches rail height)
  - Positioned at leading edge of progress bar
  - Sparks spawn from center of arrowhead

- **Visual Metaphor**: Dark green bar "carves" into gray unplayed area, with bright arrowhead at the cutting edge shooting sparks backward

**Performance:**
- Pure CSS animations (GPU-accelerated transforms)
- Minimal DOM impact (max 15 particle divs)
- No JavaScript animation loops (CSS handles motion)
- Efficient cleanup via setTimeout
- No interference with slider interaction (transparent overlay, pointer-events: none)

**Spawn Control:**
- Only spawns during playback (paused = no particles)
- Stops spawning when user drags slider
- Spawners start/stop cleanly on playback state changes
- Proper cleanup on component unmount

**Accessibility:**
- `@media (prefers-reduced-motion: reduce)` completely hides particles
- `aria-hidden="true"` on particle overlay
- `pointer-events: none` prevents interaction blocking
- Keyboard navigation unaffected

**Design Evolution:**
- Initial design had particles flying upward/outward - changed to leftward for "carving" effect
- Originally used opacity fade - removed for instant disappearance (more retro)
- Started with fixed spawn intervals - switched to random dual-spawner system for organic feel
- Added gravity after initial implementation for realistic parabolic arcs
- Vertical velocity adjusted multiple times to balance gravity and achieve centered distribution
- Arrowhead iterated from vertical bar → wide chevron → narrow chevron matching rail height

**Haiku:**

*Green sparks fly backward*
*As the chisel carves through gray*
*Time made visible*

---

## 🔧 Technical Guidelines

**Performance:**
- Use CSS animations where possible (GPU-accelerated)
- Prefer `transform` and `opacity` over layout properties
- Use `requestAnimationFrame` for JavaScript animations
- Throttle/debounce expensive operations (scroll, audio analysis)

**Accessibility:**
- Always implement `@media (prefers-reduced-motion: reduce)` media query
- Disable or reduce animations for users who prefer less motion
- Maintain keyboard navigation and focus indicators
- Use ARIA labels for dynamic content

**Aesthetic Consistency:**
- Snap animations to character grid: `--charW1` (8px), `--charW2` (16px)
- Use `steps()` timing function for chunky retro feel
- Reference CSS variables: `--accent`, `--accent-dark`, `--background`, etc.
- Maintain DOS terminal aesthetic throughout

**Audio Integration:**
- Access `audioCtx` and `playerNode` from App component
- Use Web Audio API `AnalyserNode` for frequency/amplitude data
- Smooth audio-reactive animations with `requestAnimationFrame`
- Don't block audio thread with heavy computations

---

## 📝 Implementation Progress

**Current Status**: Phase 1 in progress
**Next Steps**: Continue Phase 1 implementations

**Completed Items**: 2/15
**In Progress**: None
**Blocked**: None

---

## 🎯 Design Goals

All animations should feel:
- ✅ **Chunky** - Stepped, pixelated, grid-aligned
- ✅ **Musical** - Responsive to audio when playing
- ✅ **Retro** - CRT monitors, DOS terminals, NES games
- ✅ **Functional** - Never sacrifice usability for style
- ✅ **Accessible** - Respect user preferences and motion sensitivity

**Goal**: Transform the site into a living, breathing retro music player that celebrates the chip music aesthetic while providing a modern, delightful user experience.
