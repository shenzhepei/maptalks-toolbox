import i18n, { type TFunction } from 'i18next'
import { initReactI18next } from 'react-i18next'
import { languageStorageKey, resolveLanguage } from './lib/language'

const en = {
  meta: { title: 'GIS Toolbox · maptalks', description: 'A privacy-minded maptalks GIS toolbox for GeoJSON, map services, and image export.' },
  language: { label: 'Language', english: 'English', chinese: '简体中文' },
  app: { openTools: 'Open tools', home: 'GIS Toolbox home', brand: 'GIS Toolbox', powered: 'Powered by maptalks', settings: 'Optional AMap services', toolSelection: 'Tool selection', closeTools: 'Close tools', waiting: 'Waiting for map' },
  features: {
    explore: { label: 'Map explorer', description: 'Search places, inspect coordinates, and switch base layers.' },
    'geojson-studio': { label: 'GeoJSON studio', description: 'Draw points, lines, and polygons, then copy converted GeoJSON.' },
    'layer-lab': { label: 'Layer lab', description: 'Load and inspect custom XYZ, WMS, and ArcGIS tile services.' },
    'gis-export': { label: 'GIS to image', description: 'Render GeoJSON, select a region, and export a PNG.' },
  },
  credentials: { title: 'Optional AMap services', subtitle: 'Maptalks works without a key', close: 'Close', privacyTitle: 'Your service credentials stay local', privacyBody: "This site never receives or uploads your key. It remains in this browser's local storage until you clear it, and is sent directly to AMap only when its services are loaded.", apiKey: 'Web JS API key', apiPlaceholder: 'Enter your key', securityCode: 'Security code', securityPlaceholder: 'Enter your security code', required: 'Enter both values to continue.', console: 'AMap console', guide: 'Setup guide', clear: 'Clear', cancel: 'Cancel', save: 'Save services' },
  explorer: { placeSearch: 'Place search', keyword: 'Place keyword', searchPlaceholder: 'Search a place', search: 'Search', coordinates: 'Coordinates', coordinateInput: 'Longitude and latitude', locate: 'Locate', copy: 'Copy {{system}}', invalidCoordinate: 'Use longitude, latitude within valid ranges.', searchFailed: 'Search failed.' },
  layers: { local: 'Layer configurations stay in this browser.', name: 'Layer name', namePlaceholder: 'Road network', type: 'Service type', url: 'Service URL', wmsLayers: 'WMS layers', add: 'Add layer', custom: 'Custom layers', hide: 'Hide layer', show: 'Show layer', up: 'Move layer up', down: 'Move layer down', remove: 'Remove layer', opacity: 'Opacity', empty: 'No custom layers', addFailed: 'The layer could not be added.', xyz: 'XYZ tiles', wms: 'WMS', arcgis: 'ArcGIS MapServer' },
  export: { data: 'GeoJSON data', import: 'Import file', demo: 'Demo data', features: '{{count}} features', clearData: 'Clear data', area: 'Export area', draw: 'Drawing...', select: 'Select region', reset: 'Reset', drawHint: 'Draw a rectangle on the map', selected: 'Region selected', selectionFailed: 'Region selection failed.', output: 'PNG output', zoom: 'Detail zoom', current: 'Current view', selectedRegion: 'Selected region', capturing: 'Capturing', merging: 'Merging', downloaded: 'PNG downloaded', exportFailed: 'PNG export failed.', fileFailed: 'The file could not be read.' },
  map: { baseLayer: 'Base map layer', standard: 'Standard map', satellite: 'Satellite map', canvas: 'maptalks map canvas', loading: 'Loading map', loadFailed: 'The maptalks map could not be loaded.' },
  studio: { drawingTools: 'Drawing tools', point: 'Point', line: 'Line', polygon: 'Polygon', draw: 'Draw {{mode}}', cancelDrawing: 'Cancel drawing', undo: 'Undo', redo: 'Redo', import: 'Import GeoJSON', clear: 'Clear workspace', drawing: 'Drawing {{mode}}', repeat: 'Repeat', views: 'GeoJSON workspace views', json: 'JSON', table: 'Table', style: 'Style', analysis: 'Analysis', featureCount: '{{count}} features', deleteFeature: 'Delete feature', noFeatures: 'No features', name: 'Name', featureName: 'Feature name', type: 'Type', input: 'Input', converted: 'Converted', dataView: 'GeoJSON data view', inputCrs: 'Input coordinate system', outputCrs: 'Output coordinate system', editable: 'Editable GeoJSON', convertedOutput: 'Converted GeoJSON output', format: 'Format', apply: 'Apply', copyOutput: 'Copy output', download: 'Download', stroke: 'Stroke', fill: 'Fill', points: 'Points', strokeWidth: 'Stroke width', fillOpacity: 'Fill opacity', pointRadius: 'Point radius', resetStyle: 'Reset style', measure: 'Measure on map', distance: 'Distance', area: 'Area', clearMeasurements: 'Clear measurements', pointInPolygon: 'Point in polygon', pointToTest: 'Point to test', testPoint: 'Test point', inside: 'Inside polygon', outside: 'Outside polygon', invalidGeoJson: 'Invalid GeoJSON.', drawingFailed: 'Drawing failed.', measurementFailed: 'Measurement failed.', polygonRequired: 'Add or select a polygon first.' },
  errors: { credentialsRequired: 'Configure optional AMap credentials from Settings to use this service.', layerProtocol: 'Layer URL must use HTTP or HTTPS.', xyzTokens: 'XYZ URL must contain {z}, {x}, and {y}.', layerName: 'Enter a layer name.', wmsName: 'Enter at least one WMS layer name.', credentialsValues: 'Both the JS API key and security code are required.', polygonFeature: 'Select a Polygon or MultiPolygon feature.', geoCollection: 'The file must contain a GeoJSON FeatureCollection.', geoFeature: 'Every item must be a valid GeoJSON Feature.', geoCoordinates: 'GeoJSON coordinates must be arrays.', exportZoom: 'Export zoom must be between 3 and 20.', viewport: 'The map viewport is not ready for export.', selectRegion: 'Select a region before exporting it.', capture: 'maptalks could not capture the map canvas.', canvas: 'The browser could not create the output canvas.', decode: 'This browser cannot decode captured map tiles.', encode: 'The browser could not encode the PNG.', generic: 'The operation could not be completed.' },
} as const

type TranslationShape<T> = {
  [K in keyof T]: T[K] extends string ? string : TranslationShape<T[K]>
}

const zhCN: TranslationShape<typeof en> = {
  meta: { title: 'GIS 地图工具箱 · maptalks', description: '注重隐私的 maptalks GIS 工具箱，支持 GeoJSON、地图服务和图片导出。' },
  language: { label: '语言', english: 'English', chinese: '简体中文' },
  app: { openTools: '打开工具', home: 'GIS 地图工具箱首页', brand: 'GIS 地图工具箱', powered: '由 maptalks 驱动', settings: '可选高德服务', toolSelection: '工具选择', closeTools: '关闭工具', waiting: '正在等待地图' },
  features: {
    explore: { label: '地图探索', description: '搜索地点、查看坐标并切换底图。' },
    'geojson-studio': { label: 'GeoJSON 工作室', description: '绘制点、线和面，并复制转换后的 GeoJSON。' },
    'layer-lab': { label: '图层实验室', description: '加载并调试 XYZ、WMS 和 ArcGIS 瓦片服务。' },
    'gis-export': { label: 'GIS 转图片', description: '渲染 GeoJSON、选择区域并导出 PNG。' },
  },
  credentials: { title: '可选高德服务', subtitle: 'maptalks 无需 Key 即可使用', close: '关闭', privacyTitle: '服务凭据仅保存在本机', privacyBody: '本站不会接收或上传你的 Key。凭据会保存在当前浏览器的本地存储中，直到你主动清除；仅在加载高德服务时由浏览器直接发送给高德。', apiKey: 'Web JS API Key', apiPlaceholder: '输入 Key', securityCode: '安全密钥', securityPlaceholder: '输入安全密钥', required: '请同时填写 Key 和安全密钥。', console: '高德控制台', guide: '配置指南', clear: '清除', cancel: '取消', save: '保存服务' },
  explorer: { placeSearch: '地点搜索', keyword: '地点关键词', searchPlaceholder: '搜索地点', search: '搜索', coordinates: '坐标', coordinateInput: '经度和纬度', locate: '定位', copy: '复制 {{system}}', invalidCoordinate: '请输入有效范围内的经度和纬度。', searchFailed: '搜索失败。' },
  layers: { local: '图层配置仅保存在当前浏览器中。', name: '图层名称', namePlaceholder: '道路网络', type: '服务类型', url: '服务 URL', wmsLayers: 'WMS 图层', add: '添加图层', custom: '自定义图层', hide: '隐藏图层', show: '显示图层', up: '上移图层', down: '下移图层', remove: '移除图层', opacity: '透明度', empty: '暂无自定义图层', addFailed: '无法添加图层。', xyz: 'XYZ 瓦片', wms: 'WMS', arcgis: 'ArcGIS MapServer' },
  export: { data: 'GeoJSON 数据', import: '导入文件', demo: '示例数据', features: '{{count}} 个要素', clearData: '清除数据', area: '导出区域', draw: '绘制中...', select: '选择区域', reset: '重置', drawHint: '请在地图上绘制矩形', selected: '已选择区域', selectionFailed: '区域选择失败。', output: 'PNG 输出', zoom: '细节缩放级别', current: '当前视图', selectedRegion: '选中区域', capturing: '采集中', merging: '合并中', downloaded: 'PNG 已下载', exportFailed: 'PNG 导出失败。', fileFailed: '无法读取文件。' },
  map: { baseLayer: '底图图层', standard: '标准地图', satellite: '卫星地图', canvas: 'maptalks 地图画布', loading: '正在加载地图', loadFailed: '无法加载 maptalks 地图。' },
  studio: { drawingTools: '绘图工具', point: '点', line: '线', polygon: '面', draw: '绘制{{mode}}', cancelDrawing: '取消绘制', undo: '撤销', redo: '重做', import: '导入 GeoJSON', clear: '清空工作区', drawing: '正在绘制{{mode}}', repeat: '连续绘制', views: 'GeoJSON 工作区视图', json: 'JSON', table: '表格', style: '样式', analysis: '分析', featureCount: '{{count}} 个要素', deleteFeature: '删除要素', noFeatures: '暂无要素', name: '名称', featureName: '要素名称', type: '类型', input: '输入', converted: '转换结果', dataView: 'GeoJSON 数据视图', inputCrs: '输入坐标系', outputCrs: '输出坐标系', editable: '可编辑 GeoJSON', convertedOutput: '转换后的 GeoJSON 输出', format: '格式化', apply: '应用', copyOutput: '复制输出', download: '下载', stroke: '描边', fill: '填充', points: '点', strokeWidth: '描边宽度', fillOpacity: '填充透明度', pointRadius: '点半径', resetStyle: '重置样式', measure: '地图测量', distance: '距离', area: '面积', clearMeasurements: '清除测量', pointInPolygon: '点是否在面内', pointToTest: '待检测坐标', testPoint: '检测坐标', inside: '位于面内', outside: '位于面外', invalidGeoJson: 'GeoJSON 无效。', drawingFailed: '绘制失败。', measurementFailed: '测量失败。', polygonRequired: '请先添加或选择一个面。' },
  errors: { credentialsRequired: '请先在设置中配置可选高德凭据。', layerProtocol: '图层 URL 必须使用 HTTP 或 HTTPS。', xyzTokens: 'XYZ URL 必须包含 {z}、{x} 和 {y}。', layerName: '请输入图层名称。', wmsName: '请至少输入一个 WMS 图层名称。', credentialsValues: 'JS API Key 和安全密钥都必须填写。', polygonFeature: '请选择 Polygon 或 MultiPolygon 要素。', geoCollection: '文件必须包含 GeoJSON FeatureCollection。', geoFeature: '每一项都必须是有效的 GeoJSON Feature。', geoCoordinates: 'GeoJSON 坐标必须使用数组。', exportZoom: '导出缩放级别必须在 3 到 20 之间。', viewport: '地图视口尚未准备好导出。', selectRegion: '请先选择导出区域。', capture: 'maptalks 无法采集地图画布。', canvas: '浏览器无法创建输出画布。', decode: '当前浏览器无法解码地图分片。', encode: '浏览器无法编码 PNG。', generic: '操作未能完成。' },
}

const errorKeys: Record<string, string> = {
  'Configure optional AMap credentials from Settings to use this service.': 'errors.credentialsRequired',
  'Layer URL must use HTTP or HTTPS.': 'errors.layerProtocol',
  'XYZ URL must contain {z}, {x}, and {y}.': 'errors.xyzTokens',
  'Enter a layer name.': 'errors.layerName',
  'Enter at least one WMS layer name.': 'errors.wmsName',
  'Both the JS API key and security code are required.': 'errors.credentialsValues',
  'Select a Polygon or MultiPolygon feature.': 'errors.polygonFeature',
  'The file must contain a GeoJSON FeatureCollection.': 'errors.geoCollection',
  'Every item must be a valid GeoJSON Feature.': 'errors.geoFeature',
  'GeoJSON coordinates must be arrays.': 'errors.geoCoordinates',
  'Export zoom must be between 3 and 20.': 'errors.exportZoom',
  'The map viewport is not ready for export.': 'errors.viewport',
  'Select a region before exporting it.': 'errors.selectRegion',
  'maptalks could not capture the map canvas.': 'errors.capture',
  'The browser could not create the output canvas.': 'errors.canvas',
  'This browser cannot decode captured map tiles.': 'errors.decode',
  'The browser could not encode the PNG.': 'errors.encode',
}

export function translateError(t: TFunction, reason: unknown, fallbackKey: string): string {
  if (!(reason instanceof Error)) return t(fallbackKey)
  const key = errorKeys[reason.message]
  if (key) return t(key)
  const output = reason.message.match(/^Output (\d+) x (\d+)px is too large\./)
  if (output) return i18n.language === 'zh-CN' ? `输出尺寸 ${output[1]} x ${output[2]}px 过大，请降低缩放级别或缩小区域。` : reason.message
  const tiles = reason.message.match(/^Export requires (\d+) tiles\./)
  if (tiles) return i18n.language === 'zh-CN' ? `导出需要 ${tiles[1]} 个分片，请降低缩放级别或缩小区域。` : reason.message
  return reason.message
}

const storedLanguage = typeof window === 'undefined' ? null : window.localStorage.getItem(languageStorageKey)

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, 'zh-CN': { translation: zhCN } },
  lng: resolveLanguage(storedLanguage),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  initAsync: false,
})

function applyLanguage(language: string): void {
  if (typeof document === 'undefined') return
  const resolved = resolveLanguage(language)
  document.documentElement.lang = resolved
  document.title = i18n.t('meta.title')
  document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', i18n.t('meta.description'))
  window.localStorage.setItem(languageStorageKey, resolved)
}

i18n.on('languageChanged', applyLanguage)
applyLanguage(i18n.language)

export default i18n
