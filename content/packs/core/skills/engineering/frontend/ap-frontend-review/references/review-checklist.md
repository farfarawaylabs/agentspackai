# Frontend review checklist

Use the relevant portions of this checklist. A finding requires evidence; a
checklist item is not automatically a defect.

## Function and state

- Primary actions, navigation, forms, dialogs, menus, and links work.
- Loading, empty, error, success, disabled, selected, and expanded states are
  understandable and reachable where applicable.
- Feedback appears near the action that caused it and persists long enough to
  understand.
- Destructive or irreversible actions communicate their consequences.
- Focus is moved or restored appropriately after overlays and navigation.

## Visual hierarchy and system consistency

- The page has a clear primary purpose and visual entry point.
- Typography, spacing, color, shape, iconography, and elevation follow
  `DESIGN.md` and the implemented token system.
- Repeated components behave and look consistently across pages.
- Alignment, grouping, density, and whitespace reflect content relationships.
- Decorative elements reinforce the intended identity rather than add noise.
- Real content remains legible; no clipping, unintended overlap, or obscured
  controls appear.

## Responsive behavior

- Check a narrow/mobile and representative desktop width plus transition widths
  where the composition changes.
- No unintended horizontal overflow occurs.
- Content reflows without lost meaning, arbitrary truncation, or distorted
  media.
- Navigation, tables, charts, forms, dialogs, and dense toolbars remain usable.
- Touch targets are comfortably operable and do not crowd one another.
- Fixed and sticky elements do not cover content or controls.
- Mobile viewport units and safe areas behave correctly.
- Long labels, localized-looking text, and unusually sparse or dense content do
  not break the layout.

## Accessibility and input

- Semantic elements and heading order match the interface structure.
- Interactive controls have accessible names and correct roles and states.
- Form fields have labels, instructions, and associated error messages.
- Keyboard users can reach and operate every interactive element.
- Focus indicators are visible and not clipped.
- Contrast is sufficient in default, hover, focus, disabled, and selected
  states.
- Images have appropriate alternative text; decorative images are ignored by
  assistive technology.
- Meaning is not communicated by color, hover, or motion alone.
- Reduced-motion preferences are respected.
- Pointer, touch, and keyboard input all receive equivalent outcomes.

## Content and trust

- Labels and calls to action state what will happen.
- Copy is specific to the product and avoids placeholder or generic AI
  language.
- Empty and error messages explain the next useful action.
- Dates, numbers, units, and statuses are formatted consistently.
- Claims, statistics, testimonials, and customer identities are not fabricated.
- Truncation does not hide information needed to make a decision.

## Motion and interaction quality

- Motion communicates feedback, orientation, focus, continuity, or state
  change.
- Animations do not delay input, trap users, trigger accidentally, or cause
  layout shift.
- Transitions are consistent with the design system and can be interrupted.
- Hover-only affordances have touch and keyboard equivalents.
- Loading indicators match whether progress is determinate or indeterminate.

## Runtime and delivery

- The browser console contains no new errors or repeated warnings caused by the
  interface.
- Images use appropriate dimensions, formats, loading behavior, and aspect
  ratios.
- Fonts load intentionally and include sensible fallbacks.
- Expensive animation, layout work, or oversized media does not visibly degrade
  interaction.
- The relevant build, tests, lint, and type checks pass.

## Final challenge

- Compare the result against the brief and `DESIGN.md`, not personal taste.
- Reconsider the leading diagnosis when source evidence does not fit the
  rendered symptom.
- Verify every claimed fix in the exact state and viewport where it failed.
- State untested pages, states, browsers, devices, and assistive technologies.
