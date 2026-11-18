# Five Machines

A single-page descent through five systems — industrial control enforcement,
video anomaly detection, image forensics, cyber-risk quantification, offline
routing. Each station animates its mechanism beat by beat as you scroll, then
hands you a working console, then says where it stops.

Static. No build step, no dependencies, no framework.

```
index.html
assets/style.css     design system — colour shifts per station
assets/scene.js      scroll engine + the five canvas figures
assets/consoles.js   the five interactive consoles
```

## Deploying

Any static host. On Vercel: import the repository, framework preset "Other",
no build command, output directory `.`.

## Notes

- Every animation span is pegged to its beat (beat *n* owns `[n/4, (n+1)/4)`),
  so the caption and the picture can never disagree.
- `prefers-reduced-motion` un-sticks the figures, reveals every beat and draws
  each figure's final frame.
- The ELA console is real: it builds the invoice, compresses it, edits one
  field, re-saves and runs error level analysis on canvas. The other four are
  simulations that run the same decision logic as the systems they illustrate,
  and each says so under the panel.
- The page is readable with JavaScript disabled — the dimming of inactive
  beats is applied by script, not by the stylesheet alone.
