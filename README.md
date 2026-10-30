# COSTBREAKDOWN

COSTBREAKDOWN is a React and TypeScript app for preparing product cost data, explaining cost differences, and testing what-if changes.

## Develop

Install dependencies once:

```sh
npm ci
```

Start the development server:

```sh
npm run dev
```

Run the type check and regression suite:

```sh
npx tsc --noEmit --pretty false
npm run verify:regressions
```

## Build

Build the web app for local production checks:

```sh
npm run build
```

Build the standalone file for users:

```sh
npm run build:offline
```

The standalone output is `dist-offline/COSTBREAKDOWN.html`. It opens directly in a browser through `file://`.

## Branches and release

- `dev` holds the full development workspace: source, tests, scripts, configs, specifications, internal docs, and work records.
- `main` holds the user-facing HTML, README, USER_GUIDE, and their required images.
- `oldmain` is the archived frontend reference. Do not develop there.
- Version 1 is the only current public release: `v1.0.0`. GitHub Releases provide `COSTBREAKDOWN.html` as the application download.

Develop and verify on `dev`. Promote the approved user-facing files to `main`. Keep development files and records on `dev`.
