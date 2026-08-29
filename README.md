# La Imagen

> **Find the image that matches the color in your head.**

A color-picker that thinks in pictures. Pick a color, and La Imagen pulls a
gallery of Unsplash photos that live in the same world — sorted by how
closely their actual pixels match what you asked for.

**→ [la-imagen.netlify.app](https://la-imagen.netlify.app)**

![License: MIT](https://img.shields.io/badge/license-MIT-111111?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=111)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=white)
![Netlify](https://img.shields.io/badge/Netlify-00C7B7?style=flat-square&logo=netlify&logoColor=white)

---

## How it works

```
   pick                search                browse
 ┌────────┐         ┌──────────┐         ┌────────────┐
 │  ◐ →  │  ────►  │ Unsplash │  ────►  │  ranked by │
 │  hex   │         │  photos  │         │  distance  │
 └────────┘         └──────────┘         └────────────┘
```

1. **Pick a color** — drag the wheel, dial in a hex, or tap a preset.
2. **Search** — La Imagen queries Unsplash for images in that color family.
3. **Browse** — results are sorted by pixel-level distance to your color, so the best match rises to the top.

The whole page is dressed as a **darkroom**: a charcoal canvas with a
live *safelight* aura behind the hero that tracks the color you just
chose. The brighter the color, the warmer the room.

---

## Stack

React 18 + React Router 6 · TypeScript · Vite · Express (deployed as a
Netlify Function) · TailwindCSS 3.

## Setup

```bash
pnpm install              # or npm install
cp .env.example .env      # then fill in keys (see below)
pnpm dev                  # http://localhost:8080
```

## Environment variables

Create `.env` in the project root:

| Key | Required | Purpose |
|-----|----------|---------|
| `UNSPLASH_ACCESS_KEY` | **Yes** | Unsplash API access key. The image search (`/api/unsplash`) returns a 500 until this is set. Get one at https://unsplash.com/developers. |
| `VITE_PUBLIC_BUILDER_KEY` | No | Used by the Builder integration, if enabled. |
| `PING_MESSAGE` | No | Custom response for `GET /api/ping`. |

### Netlify

Set `UNSPLASH_ACCESS_KEY` as an **environment variable on the function**
(Site settings → Environment variables), not just in the build. The
Express server runs as a Netlify function, so it does not read your
local `.env` at runtime.

## Scripts

- `pnpm dev` — Vite dev server
- `pnpm build` — build client + server
- `pnpm typecheck` — `tsc`
- `pnpm test` — Vitest

---

## Design notes

A small studio's identity for an image-search tool — meant to feel
closer to a darkroom than a SaaS dashboard.

- **Type system.** *Instrument Serif* (display, italic — pulls double
  duty as the wordmark), *Switzer* (body), *Space Mono* (the data line
  under the hero: hex value, page count, match distance).
- **Palette.** Charcoal `#16161A` darkroom. A single live accent: a
  fixed radial gradient behind the hero that reads `--chosen` off
  `<body>`, so the room lights up in the color you're searching for.
- **The safelight is the signature.** Everything else — the inputs, the
  grid, the type — is held quiet so that one element can carry the
  page. There is no second decoration competing with it.

## License

[MIT](./LICENSE).
