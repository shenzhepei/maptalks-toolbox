# GIS Toolbox

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

An extensible browser GIS toolbox powered by maptalks for map exploration, coordinate conversion, GeoJSON visualization, service debugging, and map image export.

**Live app:** https://shenzhepei.github.io/amap-toolbox/

## Features

- Open and explore the maptalks map without an API key.
- Inspect WGS84 coordinates by clicking the map and convert them to GCJ-02, CGCS2000, and BD-09.
- Switch between the standard and satellite base layers.
- Draw points, lines, and polygons and copy the generated GeoJSON.
- Convert drawn GeoJSON between GCJ-02, WGS84, CGCS2000, and BD-09 output.
- Keep one local GeoJSON workspace across tools with feature selection, rename, undo/redo, editable source, import, copy, and download.
- Style point, line, and polygon colors, stroke width, fill opacity, and point radius.
- Add browser-local custom XYZ, WMS, and ArcGIS MapServer tile layers.
- Toggle custom layers, adjust opacity, reorder them, and remove them without affecting other tools.
- Measure distance and area on the map, and test whether a coordinate is inside a selected polygon.
- Import GeoJSON `FeatureCollection` files containing points, lines, or polygons.
- Export the current view or a selected region as one high-resolution PNG assembled from zoomed map tiles.
- Add future GIS service adapters and maptalks-gl layers through typed registries.

## Optional AMap services

The map, GeoJSON workspace, custom layers, measurements, and image export work without an AMap key. Place search remains available as an optional AMap service. Visitors who need it can supply a **Web JS API key** and its **security code** from the [AMap console](https://console.amap.com/dev/key/app).

Credentials are stored in the current browser's `localStorage` until the visitor uses **Clear**. They are not included in source control, build output, analytics, or application logs. The browser still sends them directly to AMap as required by the AMap JavaScript API. Clear saved credentials before leaving a shared device.

For the hosted app, add `https://shenzhepei.github.io` to the allowed domains for the key. For local development, allow `localhost` according to the [AMap preparation guide](https://lbs.amap.com/api/javascript-api-v2/guide/abc/prepare).

## Local development

Requirements: Node.js 24 and pnpm 10.33.2.

```bash
corepack enable
pnpm install
pnpm dev
```

Open the displayed local URL. No map key is required; optional AMap services can be configured from Settings.

## Quality checks

```bash
pnpm test:coverage
pnpm build
```

Coverage measures the production modules under `src/lib` and produces `coverage/lcov.info`. GitHub Actions runs the checks on every push and pull request and uploads the report to Codecov. The export suite creates real colored Canvas tiles, stores them in IndexedDB, composes them into a PNG, and verifies the final pixels are nonblank and correctly positioned.

## Adding a feature

1. Add a stable ID and metadata entry to `src/lib/features.ts`.
2. Implement the feature panel under `src/components` using the shared `MapRuntime` interface.
3. Mount the panel in `src/App.vue` and add focused tests for reusable logic in `src/lib`.
4. Keep provider credentials in browser-local service adapters.

This structure keeps one maptalks map instance shared while provider services and future layer formats remain independently maintainable.

## Coordinate systems

Geometry drawn on maptalks and data stored in the shared workspace use WGS84. GCJ-02 and BD-09 conversion uses `gcoord`. Geographic CGCS2000 (EPSG:4490) uses WGS84 longitude and latitude at the application's six-decimal-place precision; it is suitable for ordinary web map exchange, not survey-grade datum transformation.

RFC 7946 standard GeoJSON uses WGS84. GCJ-02, CGCS2000, and BD-09 selections intentionally preserve the GeoJSON structure while changing coordinate values, so consumers must know the selected coordinate system.

## GeoJSON and export notes

- GeoJSON files are parsed locally and are not uploaded by this application.
- The shared GeoJSON workspace, style, and coordinate settings are stored in `localStorage`. Switching tools does not discard workspace data.
- Custom layer configurations are stored in `localStorage` and sent only to the configured tile service. Remote services must allow browser access and compatible CORS headers; HTTPS deployments cannot load insecure HTTP layers.
- The standard basemap uses CARTO tiles with OpenStreetMap data; satellite mode uses Esri World Imagery. Their availability, CORS policy, terms, and attribution apply.
- High-resolution export moves the maptalks map through every required tile at the selected detail zoom, reads the rendered map Canvas directly, and stores each PNG Blob in a temporary IndexedDB database. It then reads and merges one tile at a time, deletes the temporary database, restores the original view, and downloads one PNG.
- Browser safety limits are 16,384 pixels per side, 64 million output pixels, and 256 captured tiles. Reduce the detail zoom or selected area when a limit is exceeded.
- Imported data must declare its coordinate system. The internal workspace and maptalks renderer use WGS84.

## License

[MIT](LICENSE) © 2026 shenzhepei
