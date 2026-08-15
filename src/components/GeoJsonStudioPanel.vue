<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { Check, Circle, Clipboard, Minus, Pentagon, RotateCcw } from 'lucide-vue-next'
import type { CoordinateSystem } from '../lib/coordinates'
import { convertGeoJsonFromGcj02, type GeoJsonFeatureCollection } from '../lib/geojson'
import type { GeoJsonDrawingMode, MapRuntime } from '../lib/map-runtime'

const props = defineProps<{ runtime: MapRuntime }>()

const collection = ref<GeoJsonFeatureCollection>({ type: 'FeatureCollection', features: [] })
const target = ref<CoordinateSystem>('gcj02')
const drawing = ref<GeoJsonDrawingMode | null>(null)
const copied = ref(false)
const error = ref('')

const output = computed(() => JSON.stringify(convertGeoJsonFromGcj02(collection.value, target.value), null, 2))

const drawingModes: Array<{
  type: GeoJsonDrawingMode
  label: string
  icon: typeof Circle
}> = [
  { type: 'Point', label: 'Point', icon: Circle },
  { type: 'LineString', label: 'Line', icon: Minus },
  { type: 'Polygon', label: 'Polygon', icon: Pentagon },
]

async function draw(mode: GeoJsonDrawingMode) {
  drawing.value = mode
  error.value = ''
  try {
    const feature = await props.runtime.startGeoJsonDrawing(mode)
    collection.value = {
      type: 'FeatureCollection',
      features: [...collection.value.features, feature],
    }
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Drawing failed.'
  } finally {
    drawing.value = null
  }
}

function clear() {
  props.runtime.clearDrawings()
  collection.value = { type: 'FeatureCollection', features: [] }
  copied.value = false
  error.value = ''
}

async function copyOutput() {
  await navigator.clipboard.writeText(output.value)
  copied.value = true
  window.setTimeout(() => (copied.value = false), 1200)
}

onBeforeUnmount(() => props.runtime.clearDrawings())
</script>

<template>
  <div class="panel-scroll">
    <section class="tool-section">
      <h2>Draw geometry</h2>
      <div class="segmented-control" aria-label="Geometry type">
        <button
          v-for="mode in drawingModes"
          :key="mode.type"
          type="button"
          :class="{ active: drawing === mode.type }"
          :disabled="Boolean(drawing)"
          @click="draw(mode.type)"
        >
          <component :is="mode.icon" :size="15" />
          {{ mode.label }}
        </button>
      </div>
      <div class="drawing-summary">
        <span>{{ collection.features.length }} features</span>
        <button class="button secondary" type="button" :disabled="!collection.features.length" @click="clear">
          <RotateCcw :size="15" /> Clear
        </button>
      </div>
      <p v-if="drawing" class="status-line">Drawing {{ drawing }}</p>
      <p v-if="error" class="inline-error" role="alert">{{ error }}</p>
    </section>

    <section class="tool-section">
      <label class="field-label" for="geojson-coordinate-system">Coordinate system</label>
      <select id="geojson-coordinate-system" v-model="target">
        <option value="gcj02">GCJ-02 (AMap)</option>
        <option value="wgs84">WGS84</option>
        <option value="cgcs2000">CGCS2000 (EPSG:4490)</option>
        <option value="bd09">BD-09 (Baidu)</option>
      </select>
    </section>

    <section class="tool-section json-section">
      <div class="section-heading-row">
        <h2>GeoJSON</h2>
        <button class="icon-button" type="button" title="Copy GeoJSON" @click="copyOutput">
          <Check v-if="copied" :size="16" />
          <Clipboard v-else :size="16" />
        </button>
      </div>
      <textarea :value="output" readonly spellcheck="false" aria-label="Generated GeoJSON" />
    </section>
  </div>
</template>
