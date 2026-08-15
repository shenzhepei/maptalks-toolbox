# 高德地图工具箱

<!-- repo-languages:start -->
[English](README.md) | 简体中文
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

一个可扩展的浏览器端高德地图工具箱，支持地图探索、坐标转换、GeoJSON 可视化与地图图片导出。

**在线应用：** https://shenzhepei.github.io/amap-toolbox/

## 功能

- 搜索地点，并通过点击地图查看坐标。
- 将拾取的 GCJ-02 坐标转换为 WGS84、CGCS2000 和 BD-09。
- 切换标准底图与卫星底图。
- 绘制点、线和面，并复制生成的 GeoJSON。
- 将绘制的 GeoJSON 转换为 GCJ-02、WGS84、CGCS2000 或 BD-09 输出。
- 导入包含点、线或面的 GeoJSON `FeatureCollection` 文件。
- 将当前视图或选中区域按放大后的地图切片拼接为一张高分辨率 PNG。
- 通过带类型约束的功能注册表继续加入新的高德地图工具。

## 高德凭据

仓库和部署产物不包含任何高德 Key 或安全密钥。每位访问者需要从[高德开放平台控制台](https://console.amap.com/dev/key/app)填写自己的 **Web 端（JS API）Key** 和对应的**安全密钥**。

凭据保存在当前浏览器的 `localStorage` 中，直到访问者点击**清除**。凭据不会进入源代码、构建产物、分析服务或应用日志。按照高德 JavaScript API 的工作方式，浏览器仍会将凭据直接发送给高德服务。使用共享设备后请清除已保存的凭据。

使用在线应用时，请将 `https://shenzhepei.github.io` 加入 Key 的允许域名。本地开发时，请按照[高德准备工作指南](https://lbs.amap.com/api/javascript-api-v2/guide/abc/prepare)允许 `localhost`。

## 本地开发

需要 Node.js 24 和 pnpm 10.33.2。

```bash
corepack enable
pnpm install
pnpm dev
```

打开终端显示的本地地址，然后填写你自己的高德凭据。

## 质量检查

```bash
pnpm test:coverage
pnpm build
```

覆盖率统计 `src/lib` 下的生产模块，并生成 `coverage/lcov.info`。GitHub Actions 会在每次 push 和 pull request 时运行检查，并将报告上传到 Codecov。

## 添加新功能

1. 在 `src/lib/features.ts` 中添加稳定 ID 和功能元数据。
2. 在 `src/components` 下实现功能面板，并复用统一的 `MapRuntime` 接口。
3. 在 `src/App.vue` 中挂载面板，为 `src/lib` 中的可复用逻辑添加聚焦测试。
4. 所有高德凭据继续使用现有的浏览器本地凭据流程。

这种结构让 SDK 加载、凭据和地图实例保持共享，同时让各个功能面板可以独立维护。

## 坐标系

在高德地图上绘制的图形按 GCJ-02 处理。WGS84 与 BD-09 输出使用 `gcoord` 转换。地理坐标形式的 CGCS2000（EPSG:4490）在应用的 6 位小数精度下采用去除 GCJ-02 偏移后的 WGS84 经纬度，适合普通 Web 地图数据交换，但不能替代测绘级基准转换。

RFC 7946 标准 GeoJSON 使用 WGS84。选择 GCJ-02、CGCS2000 或 BD-09 时，工具会保留 GeoJSON 结构并转换坐标值，因此数据使用方必须知道所选坐标系。

## GeoJSON 与导出说明

- GeoJSON 文件只在本地解析，本应用不会上传这些数据。
- PNG 导出依赖浏览器 Canvas 和高德瓦片的 CORS 行为，Key 的域名限制必须允许当前站点。
- 高分辨率导出会按所选细节级别逐格移动地图，等待每格高德地图加载完成，使用 `html2canvas` 截图并将 PNG Blob 写入临时 IndexedDB。完成采集后再逐格读取、拼接，删除临时数据库，恢复原地图视图，最后只下载一张 PNG。
- 浏览器安全限制为单边最多 16,384 像素、总像素最多 6400 万、最多采集 256 格；超出限制时请降低细节级别或缩小选区。
- 导入数据应使用与高德图层兼容的坐标；在中国大陆范围内通常为 GCJ-02。

## 许可证

[MIT](LICENSE) © 2026 shenzhepei
