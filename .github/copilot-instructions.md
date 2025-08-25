This repository is a small React + TypeScript + Vite app (template-based) extended to show upcoming SpaceX launches.

Be concise and change only what is necessary. Focus on small, well-scoped edits and PRs.

Key facts (quick reference)
- Project root: `package.json` defines scripts: `dev` (vite), `build` (tsc -b && vite build), `preview` (vite preview), `lint` (eslint .)
- Vite config: `vite.config.ts` uses `@vitejs/plugin-react` and `@tailwindcss/vite`.
- Entry points: `src/main.tsx` -> `src/App.tsx`. Global styles: `src/index.css` and `src/App.css`.
- Installed runtime dependencies: `react`, `react-dom`, `wouter` (router), `lucide-react` (icons), `tailwindcss` + `@tailwindcss/vite`.
- External data source to use for features: https://content.spacex.com/api/spacex-website/launches-page-tiles/upcoming

High-level architecture and intent
- Minimal single-page React app served by Vite. The codebase currently contains the Vite + React starter UI; feature work should add new components under `src/` and wire them from `App.tsx` or a new router-based entry (the project includes `wouter` for lightweight routing).
- Styling is Tailwind-first. Prefer utility classes in JSX and small component-scoped CSS files only when necessary. `vite.config.ts` already integrates Tailwind via `@tailwindcss/vite`.
- TypeScript is enabled; use `.tsx` and keep types for exported components and data models. The build runs `tsc -b` before `vite build` so ensure type errors are addressed.

Developer workflows (explicit)
- Start dev server with: `npm run dev` (uses Vite with HMR). Use this for iterative UI work.
- Build for production: `npm run build` (runs `tsc -b` then `vite build`). Fix TypeScript errors first if the build fails.
- Preview production build: `npm run preview`.
- Lint: `npm run lint` runs `eslint .`.

Patterns and conventions in this repo
- Small, single-responsibility components under `src/`. Add new files adjacent to related components (e.g., `src/components/LaunchList.tsx`).
- Fetching remote data: prefer a single data-fetch component or a small hook (e.g., `useUpcomingLaunches`) that is responsible for calling the SpaceX endpoint. Keep fetch logic isolated for easier testing and reuse.
- Data shapes: mirror the API shape as narrow TypeScript interfaces in a `src/types` or `src/models` file. Example: define an interface for the tiles returned by the SpaceX endpoint and use it in components.
- Routing: `wouter` is available for tiny route-driven screens. Use `useLocation` and `<Route path="/..." />` patterns consistent with `wouter` docs.
- Icons: use `lucide-react` by importing individual icons from the package and render them as components.

Integration and external dependencies
- SpaceX content API: https://content.spacex.com/api/spacex-website/launches-page-tiles/upcoming — responses are JSON arrays of launch tiles; components should handle empty lists and network errors gracefully.
- Tailwind integration is done via `@tailwindcss/vite` — don't add another PostCSS plugin unless necessary.

Files to inspect for context
- `package.json` — scripts and dependencies
- `vite.config.ts` — plugin setup
- `src/main.tsx`, `src/App.tsx` — app entry and current UI
- `src/index.css`, `src/App.css` — global and component styles

Concrete examples for small tasks
- Add a fetch hook skeleton (example): create `src/hooks/useUpcomingLaunches.ts` that performs a fetch to the SpaceX URL and returns `{ data, loading, error }` typed with a local interface.
- Add a presentational component `src/components/LaunchCard.tsx` that accepts a single tile object and renders `name`, `date`, and a small icon from `lucide-react`.

Testing, build, and quality gates
- The repo has no test runner configured. For changes that affect types or build, run `npm run build` locally to validate `tsc` and the Vite build.
- Run `npm run lint` to catch style/logic issues flagged by ESLint.

What to avoid
- Don't add global CSS frameworks beyond Tailwind. Keep CSS changes small and localized.
- Don't bypass TypeScript errors; the CI/build stops on type errors because `tsc -b` runs in `build`.

If you modify or add top-level routes or global state
- Update `src/main.tsx` or `src/App.tsx` accordingly and ensure HMR works via `npm run dev`.

When you open a PR
- Keep changes small and focused. Explain the data flow for fetching launches (where the fetch happens and where state lives). Reference the SpaceX endpoint in the PR description where relevant.

If any section above is ambiguous or you want more examples (hook, component, or routing PR), tell me which example to add and I'll update this file.
