# Zurich Construction 3D Showcase

Minimal landing page and dedicated 3D client presentation links.

## Getting started

Run `npm install`, then `npm run dev`.

## Add a client presentation

1. Export a browser-optimized GLB model with textures.
2. Add it to `public/models/<client-slug>.glb` (for example `public/models/dr-neil.glb`).
3. Open `https://zurichconstruction.vercel.app/3d/<client-slug>`.
4. Optional: change the display name in `src/viewer.js`.

Client links are not listed publicly, but they are accessible to anyone with the URL. Use authentication for confidential content.
