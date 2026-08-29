# La Imagen

A color-picker web app: pick a color (wheel, presets, or hex), then browse
color-matched images from Unsplash.

## Stack
React 18 + React Router 6 (SPA) · TypeScript · Vite · Express (serverless, Netlify) · TailwindCSS 3.

## Setup
```bash
pnpm install        # or npm install
cp .env.example .env  # then fill in keys (see below)
pnpm dev            # http://localhost:8080
```

## Environment variables
Create `.env` in the project root:

| Key | Required | Purpose |
|-----|----------|---------|
| `UNSPLASH_ACCESS_KEY` | **Yes** | Unsplash API access key. The image search (`/api/unsplash`) returns a 500 until this is set. Get one at https://unsplash.com/developers. |
| `VITE_PUBLIC_BUILDER_KEY` | No | Used by the Builder integration, if enabled. |
| `PING_MESSAGE` | No | Custom response for `GET /api/ping`. |

### Netlify
Set `UNSPLASH_ACCESS_KEY` as an **environment variable on the function** (Site settings → Environment variables), not just in the build. The Express server runs as a Netlify function, so it does not read your local `.env` at runtime.

## Scripts
- `pnpm dev` — Vite dev server
- `pnpm build` — build client + server
- `pnpm typecheck` — `tsc`
- `pnpm test` — Vitest

## Design
- Type system: **Instrument Serif** (display, italic), **Switzer** (body), **Space Mono** (data line).
- Palette: charcoal `#16161A` darkroom with a live "safelight" aura behind the hero — a fixed radial gradient driven by the currently selected color (`--chosen` CSS var on `<body>`).

## License
[MIT](./LICENSE).
