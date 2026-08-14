---
name: animation-vocabulary
description: Reverse-lookup glossary that turns a vague description of a web animation or motion effect into its exact term ("the bouncy thing when a popover opens" â†’ Pop in; "the iOS rubber-band scroll" â†’ Rubber-banding). Use when the user asks "what's it called whenâ€¦", or describes a motion effect without knowing its name and wants the right word to prompt an AI or designer with. For naming an effect, not designing or building one.
---

# Animation Vocabulary

Turn a vague description of a motion or effect into the precise term, so the user knows what to ask for.

## Quick Start

The user describes an effect loosely. You return the matching term(s) in this format:

```
**Stagger** â€” Animate several items one after another with a small delay between each, creating a cascade.
```

If several terms could fit, list the best match first, then 1â€“2 alternates with a one-line note on how they differ.

## Instructions

1. **Read for intent, not keywords.** Users describe what they *see* or *feel* ("springy", "slides off", "draws itself in"), not the technical name. Map the sensation to the glossary below.
2. **Quote the glossary verbatim.** Its descriptions are authoritative â€” use them as-is, don't paraphrase.
3. **Disambiguate close terms.** When two compete (*Clip-path* vs *Mask*, *Pop in* vs *Bounce*, *Shared element transition* vs *Layout animation*), contrast them so the user can pick.
4. **When nothing matches exactly,** name the closest term and say plainly it's an approximation, or describe the effect in the glossary's vocabulary (e.g. "that's a *stagger* of *scale-in* entrances").
5. **Stay within this glossary.** If a term genuinely isn't here, say so rather than inventing one â€” though you may explain the concept using these words.
6. **Keep it tight.** A naming question wants a name, not an essay. Lead with the term; expand only if asked.

## Examples

**Example 1 â€” feel-based**
User: "What's it called when a popover seems to grow out of the button you clicked instead of from its middle?"
Output:
```
**Origin-aware animation** â€” An element animates out of its trigger, like a popover growing from the button that opened it instead of from its own center which is the default in CSS.
```

**Example 2 â€” disambiguation**
User: "The thing where one image turns into another image."
Output:
```
**Morph** â€” One shape smoothly turns into another shape, e.g. Dynamic Island.

Close alternates:
- **Crossfade** â€” if they simply fade over each other in the same spot.
- **Shared element transition** â€” if an element travels and transforms from one position into another.
```

**Example 3 â€” physics feel**
User: "That iOS scroll where it resists and snaps back when you pull too far."
Output:
```
**Rubber-banding** â€” Resistance and snap-back when you drag past a boundary (the iOS overscroll feel).
```

## Glossary

_A curated snapshot mirroring the project's `/vocabulary` page; keep the two in sync when either changes._

### Entrances & Exits â€” how elements appear and disappear
- **Fade in / Fade out** â€” Element appears or disappears by changing opacity.
- **Slide in** â€” Element enters by sliding in from off-screen (left, right, top, or bottom).
- **Scale in** â€” Element grows from smaller to full size as it appears, often paired with a fade.
- **Pop in** â€” Element appears with a slight overshoot, like it bounces into place.
- **Reveal** â€” Content is uncovered gradually, often by animating a clip-path or mask.
- **Enter / Exit** â€” The animation an element plays when it's added to or removed from the screen.

### Sequencing & Timing â€” coordinating multiple elements or moments
- **Keyframes** â€” Defined points in an animation (0%, 50%, 100%) that the browser fills the gaps between.
- **Interpolation / Tween** â€” Generating all the in-between frames between a start and end value, so motion is continuous.
- **Stagger** â€” Animate several items one after another with a small delay between each, creating a cascade.
- **Orchestration** â€” Deliberately timing multiple animations so they feel like one coordinated motion.
- **Delay** â€” Time before an animation starts.
- **Duration** â€” How long an animation takes.
- **Fill mode** â€” Whether an element keeps its first or last frame's styles before the animation starts or after it ends (e.g. forwards).
- **Stepped animation** â€” An animation that is divided into discrete steps, like a countdown timer.

### Movement & Transforms â€” changing an element's position, size, or angle
- **Translate** â€” Move an element along the X or Y axis.
- **Scale** â€” Make an element bigger or smaller.
- **Rotate** â€” Spin an element around a point.
- **Skew** â€” Slant an element along the X or Y axis, shearing it out of its rectangular shape.
- **3D tilt / Flip** â€” Rotate in 3D space (rotateX / rotateY) to add depth.
- **Perspective** â€” How strong the 3D effect looks â€” a lower value exaggerates depth, like the viewer is closer.
- **Transform origin** â€” The anchor point a scale or rotation grows or spins from.
- **Origin-aware animation** â€” An element animates out of its trigger, like a popover growing from the button that opened it instead of from its own center which is the default in CSS.

### Transitions Between States â€” connecting one state, view, or element to another
- **Crossfade** â€” One element fades out as another fades in, in the same spot.
- **Continuity transition** â€” A change that keeps the user oriented by visually connecting before and after. For example, making the same rectangle bigger and smaller.
- **Morph** â€” One shape smoothly turns into another shape, e.g. Dynamic Island.
- **Shared element transition** â€” An element travels and transforms from one position into another, like a thumbnail expanding into a card.
- **Layout animation** â€” When an element's size or position changes, it animates to the new spot instead of snapping.
- **Accordion / Collapse** â€” A section smoothly expands and collapses its height to show or hide content.
- **Direction-aware transition** â€” Content slides one way going forward and the opposite way going back, so navigation has a sense of direction.

### Scroll â€” motion tied to scrolling or navigating between views
- **Scroll reveal** â€” Elements fade or slide into place as they enter the viewport.
- **Scroll-driven animation** â€” An animation whose progress is tied directly to scroll position.
- **Parallax** â€” Background and foreground move at different speeds while scrolling, creating depth.
- **Page transition** â€” An animation that plays when navigating from one page or route to another.
- **View transition** â€” The browser morphs between two states or pages, connecting shared elements.

### Feedback & Interaction â€” responding to the user's actions
- **Hover effect** â€” Visual change when the cursor moves over an element.
- **Press / Tap feedback** â€” A subtle scale-down when an element is clicked, so it feels physical.
- **Hold to confirm** â€” A progress effect that fills up while the user holds a button.
- **Drag** â€” Moving an element by grabbing it, often with momentum when released.
- **Drag to reorder** â€” Dragging items in a list to rearrange them, while the others shift to make room.
- **Swipe to dismiss** â€” Dragging an element off-screen to close it, like a drawer or toast.
- **Rubber-banding** â€” Resistance and snap-back when you drag past a boundary (the iOS overscroll feel).
- **Shake / Wiggle** â€” A quick side-to-side jitter signaling an error or rejected input.
- **Ripple** â€” A circle expanding from the point of a tap, confirming the press.

### Easing â€” how speed changes over an animation
- **Easing** â€” The rate at which an animation speeds up or slows down.
- **Ease-out** â€” Starts fast, ends slow. The default for most UI and anything responding to the user.
- **Ease-in** â€” Starts slow, ends fast. Usually avoided; can feel sluggish.
- **Ease-in-out** â€” Slow, fast, slow. Good for elements already on screen moving from A to B.
- **Linear** â€” Constant speed. Avoid for UI; reserve for spinners or marquees.
- **Cubic-bezier** â€” A custom easing curve you define for precise control.
- **Asymmetric easing** â€” A curve that accelerates and decelerates at different rates. Feels more alive than a symmetric one.

### Spring Animations â€” physics-based motion as an alternative to fixed-duration easing
- **Spring** â€” Motion driven by physics (tension, mass, damping) rather than a set duration.
- **Stiffness / Tension** â€” How strongly the spring pulls toward its target. Higher feels snappier.
- **Damping** â€” How quickly a spring settles. Lower damping means more bounce and oscillation.
- **Mass** â€” How heavy the animated element feels. More mass makes it slower and more sluggish.
- **Bounce** â€” A spring that overshoots and settles, adding playfulness.
- **Perceptual duration** â€” How long a spring feels finished, even though it keeps micro-settling underneath.
- **Momentum** â€” Motion that carries velocity, especially after a drag or interruption.
- **Velocity** â€” How fast and in which direction an element is moving. A spring carries it into the next animation when interrupted, so a flicked element keeps its speed.
- **Interruptible animation** â€” An animation that can be smoothly redirected mid-flight instead of finishing first.

### Looping & Ambient Motion â€” animations that run on their own
- **Marquee** â€” Text or content that scrolls continuously in a loop.
- **Loop** â€” An animation that repeats, a set number of times or infinitely.
- **Alternate (yoyo)** â€” A loop that plays forward then reverses each iteration, instead of jumping back to the start.
- **Orbit** â€” An element circling around another in a continuous path.
- **Pulse** â€” A gentle repeating scale or opacity change to draw attention.
- **Float** â€” A gentle, continuous up-and-down drift that makes a static element feel alive and weightless.
- **Idle animation** â€” Subtle motion that plays while an element is just sitting there, waiting to be interacted with.

### Polish & Effects â€” the small touches that separate good from great
- **Blur** â€” A blur filter used to soften an element or mask tiny imperfections.
- **Clip-path** â€” Clipping an element to a shape, used for reveals, masks, and before/after sliders.
- **Mask** â€” Hiding or revealing parts of an element using a shape or gradient â€” like clip-path, but with soft, fadeable edges.
- **Before / after slider** â€” A draggable divider that wipes between two overlaid images to compare them.
- **Line drawing** â€” An SVG path that draws itself in, like an invisible pen tracing it.
- **Text morph** â€” Text that animates character by character when it changes, drawing attention to the new value.
- **Skeleton / Shimmer** â€” A placeholder with a moving sheen shown while content loads.
- **Number ticker** â€” Digits rolling or counting up to a value.
- **Tabular numbers** â€” Fixed-width digits so numbers don't shift around as they change. Essential for tickers, timers, and counters.
- **Typewriter** â€” Text appearing one character at a time, as if being typed.

### Performance â€” what keeps motion smooth instead of stuttering
- **Frame rate (FPS)** â€” Frames drawn per second. 60fps is the baseline for smooth motion; 120fps on newer displays.
- **Jank** â€” Visible stutter when the browser drops frames because it can't keep up with the animation.
- **Dropped frame** â€” A frame the browser missed its deadline to draw, causing a tiny hitch in motion.
- **Compositing** â€” Letting the GPU move or fade an element on its own layer without redoing layout or paint.
- **will-change** â€” A CSS hint that an element is about to animate, so the browser can promote it to its own layer ahead of time.
- **Layout thrashing** â€” Animating properties like width, height, top, or left that force the browser to recalculate layout every frame, causing jank.

### Principles to Know â€” concepts that guide when and how to animate
- **Purposeful animation** â€” Motion should serve a function â€” orient, give feedback, show relationships â€” not just decorate.
- **Anticipation** â€” A small wind-up in the opposite direction before a move, hinting at what's about to happen.
- **Follow-through** â€” Parts of an element keep moving and settle slightly after the main motion stops, adding weight.
- **Squash & stretch** â€” Deforming an element as it moves to convey weight, speed, and flexibility.
- **Perceived performance** â€” The right animation makes an interface feel faster, even when it isn't.
- **Frequency of use** â€” The more often a user sees an animation, the shorter and subtler it should be.
- **Spatial consistency** â€” Animating so an element keeps its identity and position across states, so users never lose track of where things went.
- **Hardware acceleration** â€” Animating transform and opacity lets the GPU keep motion smooth.
- **Reduced motion** â€” Respecting the user's prefers-reduced-motion setting by toning down or removing motion.
