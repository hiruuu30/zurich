# Zurich Construction 3D Showcase

Minimal landing page and individual interactive 3D client presentations.

## Activate Dr. Neil

1. Download the prepared optimized file `dr-neil.glb` from the delivery.
2. Upload it to the repository as `public/models/dr-neil.glb` on `main`.
3. Open https://zurichconstruction.vercel.app/3d/dr-neil after deployment.

The viewer automatically reads the eight saved Enscape camera scenes from `src/project-scenes.json` and preserves 14 embedded texture images. Known material names get calibrated metallic/roughness values, neutral environment reflections, AgX tone mapping, and three optional exposure presets. These are web rendering adjustments, **not** physically identical Enscape lighting.

Client links are public to anyone with the URL unless access controls are added.

## Client review experience (feature branch)

Includes guided camera tours, surface-anchored revision notes, approval and change-request drafts, downloadable review reports, email composition, PNG capture, and camera-specific sharing.

Feedback, reviewer names, and review decisions are currently stored only on each client's browser. They are **not transmitted to Zurich** automatically. Clients must download the report or use the email handoff. Shared camera links do not include private review notes.

Run `npm run test` for deterministic URL, tour, review data and HTML escaping checks.
