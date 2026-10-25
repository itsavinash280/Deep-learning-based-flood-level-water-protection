# FloodWatch interface decisions

Guided by [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill),
installed as the `ui-ux-pro-max` Codex skill. Searches used the environmental
monitoring dashboard context and the specific outcomes of text readability and
touch target sizing. The existing plain HTML/CSS/JavaScript stack is retained.

## Applied improvements

- Retain the recognizable teal navigation and clear light surfaces. Use stronger
  foreground colours on light backgrounds, with a readable type hierarchy.
- Use 16px form inputs and body copy where practical; keep secondary labels at
  least 12px. Maintain comfortable spacing and tabular numeric metrics.
- Increase main control targets to 44 CSS pixels for comfortable web interaction.
  This is a product choice; it is not a claim that native platform units define
  web accessibility conformance.
- Reflow cards and forms on narrow viewports. Match the forecast SVG coordinate
  width to its actual container so chart labels do not shrink on phones.
- Make the closed mobile navigation inert, provide a close control and scrim,
  and return keyboard focus on Escape or close.
- Associate password confirmation errors with the input, show a clear error
  message, and preserve password manager support and paste.
- Preserve reduced-motion support and distinguish synthetic scenarios from live
  telemetry. Public educational data remains separate from real flood claims.

## Verification boundary

Build and automated interaction checks are recorded in the delivery. Browser
inspection requires the user's browser permission; earlier preview access was
declined. This document does not claim a complete WCAG conformance audit.
