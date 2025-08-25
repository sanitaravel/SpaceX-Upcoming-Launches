# SpaceX Upcoming Launches Dashboard

A small React + TypeScript + Vite single-page app that shows upcoming SpaceX launches.

Quick facts

- Data source: https://content.spacex.com/api/spacex-website/launches-page-tiles/upcoming
- Tech: React, TypeScript, Vite, Tailwind CSS, lucide-react (icons)

Quickstart

1. Install deps

```bash
npm install
```

2. Run development server (Vite + HMR)

```bash
npm run dev
```

3. Build for production

```bash
npm run build
```

(this runs `tsc -b` then `vite build`)

4. Preview the production build

```bash
npm run preview
```

5. Lint

```bash
npm run lint
```

Developer notes

- The project includes a dev-server proxy in `vite.config.ts` that forwards `/api/spacex/*` to SpaceX content endpoints to avoid CORS during development.
- The main data-fetching logic lives in `src/hooks/useUpcomingLaunches.ts`. It polls the SpaceX tiles endpoint and enriches items with authoritative times and optional webcast URLs.
- A single shared ticker hook `src/hooks/useNow.ts` synchronizes per-second clocks across the UI.
- The build emits precompressed assets (`.gz` / `.br`) via a Vite compression plugin; configure your production server to serve those if desired.
- If you want guaranteed mono-font rendering for countdowns, add the font file(s) under `public/fonts/` (the project references `Roboto-Mono.otf`).

Dependencies (high level)

- react
- react-dom
- tailwindcss and `@tailwindcss/vite`
- lucide-react

Contributions

This repository is not open for external contributions. No pull requests or forks will be accepted.

License & ownership

This repository is maintained privately; consult the project owner for any licensing questions.
