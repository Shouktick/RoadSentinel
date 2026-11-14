> Historical document from before the documented-model replacement. It is retained for project history, not as the current contract. See [README](../README.md), [MODEL_CARD.md](MODEL_CARD.md) and [RELEASE.md](RELEASE.md) for the current release.

# RoadSentinel design system

The interface resembles a restrained automotive instrument panel: graphite surfaces, fine structural borders, tabular metrics, and a single lime interactive accent. Teal/amber/red are reserved for explicitly identified severity or status; unknown numeric classes use neutral class palettes.

## Tokens and typography

`frontend/src/app/roadsentinel.css` owns dark/light tokens: bg, surface, surface-2, text, muted, stroke, accent/accent-ink, teal, amber, red, blue. Use these variables in components and SVG. Body uses system sans-serif; display uses Bahnschrift/Arial Narrow with system fallbacks. No remote font request is required. Heading hierarchy: one route h1, panel h2, subtopic h3. Numbers use tabular figures.

Spacing follows roughly 4/8/12/16/24/32 pixels. Panel radius is 11px, controls 6-7px, and borders 1px. Border shadows/glows are not used as default panel decoration. State is never communicated by color alone.

## Responsive layout

At 1200px the hero/readiness layout stacks and main gutters contract. At 900px navigation collapses to icons and prediction panels stack. At 640px a labelled navigation drawer and bottom shortcuts replace the fixed sidebar, content uses 16px gutters, and primary cards stack. Tables scroll inside their container. Interactive fields have visible focus and accessible labels.

## Speedometer semantics

SVG ticks, numeric values and animated needle describe the posted speed-limit feature. Gauge color bands are scale decoration, not inferred legal or safety thresholds. A legal marker is only rendered if a verified legal limit is supplied. The existing model's native unit is unverified, so display conversion is withheld. For verified manifests, conversion uses one utility and changing the display unit does not mutate the canonical model value.

## States and motion

Queries show actual loading, retryable failures, meaningful empty states and capability limitations. No fake processing timer or fabricated count-up is used. Upload progress comes from actual XMLHttpRequest upload events; backend row progress is explicitly not streamed. Framer Motion smooths the gauge needle and respects reduced motion; global CSS disables decorative motion when requested.

Keyboard navigation includes native controls, skip link, labelled drawer/theme controls, native modal dialogs, and Ctrl/Cmd+K navigation. The onboarding is dismissible. Contrast and responsive behavior require browser verification; no WCAG certification or Lighthouse score is implied by these tokens.
