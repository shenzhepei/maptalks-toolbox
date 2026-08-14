# AMap Toolbox

<!-- repo-languages:start -->
English | [简体中文](README-zh-CN.md)
<!-- repo-languages:end -->

<!-- repo-badges:start -->
[![Node.js 24](https://img.shields.io/badge/Node.js-24-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![pnpm 10.33.2](https://img.shields.io/badge/pnpm-10.33.2-F69220?style=flat-square&logo=pnpm&logoColor=white)](https://pnpm.io)
[![Vue 3.5.41](https://img.shields.io/badge/Vue-3.5.41-4FC08D?style=flat-square&logo=vuedotjs&logoColor=white)](https://vuejs.org)
[![Vite 8.2.1](https://img.shields.io/badge/Vite-8.2.1-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev)
[![TypeScript 6.0.3](https://img.shields.io/badge/TypeScript-6.0.3-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Test Coverage](https://img.shields.io/codecov/c/github/shenzhepei/amap-toolbox?style=flat-square&logo=codecov)](https://codecov.io/gh/shenzhepei/amap-toolbox)
[![License](https://img.shields.io/github/license/shenzhepei/amap-toolbox?style=flat-square)](https://github.com/shenzhepei/amap-toolbox/blob/HEAD/LICENSE)
[![Sponsor](https://img.shields.io/github/sponsors/shenzhepei?style=flat-square&logo=githubsponsors&label=Sponsor)](https://github.com/sponsors/shenzhepei)
<!-- repo-badges:end -->

An extensible browser toolbox for AMap exploration, coordinate conversion, GeoJSON visualization, and map image export.

**Live app:** https://shenzhepei.github.io/amap-toolbox/

## Features

- Search for places and inspect coordinates by clicking the map.
- Convert GCJ-02 coordinates to WGS84 and BD-09.
- Switch between the standard and satellite base layers.
- Import GeoJSON `FeatureCollection` files containing points, lines, or polygons.
- Draw a rectangle and export the current view or selected region as PNG.
- Add future AMap utilities through a typed feature registry.

## AMap credentials

The repository and deployment contain no AMap key or security code. Each visitor supplies a **Web JS API key** and its **security code** from the [AMap console](https://console.amap.com/dev/key/app).

Credentials are stored only in the current tab's `sessionStorage`. They are not included in source control, build output, analytics, or application logs. The browser still sends them directly to AMap as required by the AMap JavaScript API.

For the hosted app, add `https://shenzhepei.github.io` to the allowed domains for the key. For local development, allow `localhost` according to the [AMap preparation guide](https://lbs.amap.com/api/javascript-api-v2/guide/abc/prepare).

## Local development

Requirements: Node.js 24 and pnpm 10.33.2.

```bash
corepack enable
pnpm install
pnpm dev
```

Open the displayed local URL and enter your own AMap credentials.

## Quality checks

```bash
pnpm test:coverage
pnpm build
```

Coverage measures the production modules under `src/lib` and produces `coverage/lcov.info`. GitHub Actions runs the checks on every push and pull request and uploads the report to Codecov.

## Adding a feature

1. Add a stable ID and metadata entry to `src/lib/features.ts`.
2. Implement the feature panel under `src/components` using the shared `MapRuntime` interface.
3. Mount the panel in `src/App.vue` and add focused tests for reusable logic in `src/lib`.
4. Keep AMap credentials in the existing session-only credential flow.

This structure keeps SDK loading, credentials, and the map instance shared while feature panels remain independently maintainable.

## GeoJSON and export notes

- GeoJSON files are parsed locally and are not uploaded by this application.
- PNG export depends on browser canvas and AMap tile CORS behavior. AMap key domain restrictions must permit the current site.
- Imported data should use coordinates compatible with the AMap layer being displayed, normally GCJ-02 within mainland China.

## License

[MIT](LICENSE) © 2026 shenzhepei
