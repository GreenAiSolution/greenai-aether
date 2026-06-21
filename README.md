# AETHER by GreenAI

A fully 3D, immersive marketing site for AETHER — GreenAI's autonomous AI agent service. Custom AI employees that handle real business workflows end-to-end, deployed in 48 hours.

🔗 **Live site:** https://greenaisolution.github.io/greenai-aether/

## Stack
- Pure HTML / CSS / vanilla JS — no build step
- Three.js (r0.160) via CDN for the WebGL scene
- Hosted on GitHub Pages

## What's in here
- `index.html` — markup, scroll panels, onboarding modal
- `styles.css` — design system + 3D scene styles
- `app.js` — Three.js metropolis scene, scroll cinematics, form submission handler
- `agents/sales-sdr/` — production agent templates (system prompts + integration specs)

## Run locally
```bash
python3 -m http.server 8093
```
Then visit http://localhost:8093

---

© 2026 GreenAI Solutions · contact: jaden@greenaidigital.com
