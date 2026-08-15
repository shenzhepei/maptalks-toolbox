<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowDown, ArrowUp, Eye, EyeOff, Layers3, Plus, ShieldCheck, Trash2 } from 'lucide-vue-next'
import {
  createCustomLayer,
  loadCustomLayers,
  saveCustomLayers,
  type CustomLayerDefinition,
  type CustomLayerType,
} from '../lib/custom-layers'
import type { MapRuntime } from '../lib/map-runtime'

const props = defineProps<{ runtime: MapRuntime }>()

const layerTypes: Array<{ value: CustomLayerType; label: string }> = [
  { value: 'xyz', label: 'XYZ tiles' },
  { value: 'wms', label: 'WMS' },
  { value: 'arcgis', label: 'ArcGIS MapServer' },
]
const layers = ref(loadCustomLayers())
const name = ref('')
const type = ref<CustomLayerType>('xyz')
const url = ref('')
const wmsLayers = ref('')
const error = ref('')

function persist() {
  saveCustomLayers(layers.value)
}

function addLayer() {
  try {
    const layer = createCustomLayer({ name: name.value, type: type.value, url: url.value, wmsLayers: wmsLayers.value })
    layers.value = [...layers.value, layer]
    persist()
    props.runtime.setCustomLayers(layers.value)
    name.value = ''
    url.value = ''
    wmsLayers.value = ''
    error.value = ''
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'The layer could not be added.'
  }
}

function toggleLayer(layer: CustomLayerDefinition) {
  layer.visible = !layer.visible
  persist()
  props.runtime.updateCustomLayer(layer.id, { visible: layer.visible })
}

function setOpacity(layer: CustomLayerDefinition, event: Event) {
  layer.opacity = Number((event.target as HTMLInputElement).value)
  persist()
  props.runtime.updateCustomLayer(layer.id, { opacity: layer.opacity })
}

function moveLayer(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= layers.value.length) return
  const next = [...layers.value]
  ;[next[index], next[target]] = [next[target], next[index]]
  layers.value = next
  persist()
  props.runtime.setCustomLayers(next)
}

function removeLayer(layer: CustomLayerDefinition) {
  layers.value = layers.value.filter((item) => item.id !== layer.id)
  persist()
  props.runtime.removeCustomLayer(layer.id)
}

onMounted(() => props.runtime.setCustomLayers(layers.value))
onBeforeUnmount(() => props.runtime.clearCustomLayers())
</script>

<template>
  <div class="panel-scroll layer-lab">
    <section class="tool-section layer-source-form">
      <div class="local-data-note"><ShieldCheck :size="16" /><span>Layer configurations stay in this browser.</span></div>
      <label class="field-label" for="layer-name">Layer name</label>
      <input id="layer-name" v-model="name" placeholder="Road network" />
      <label class="field-label" for="layer-type">Service type</label>
      <select id="layer-type" v-model="type">
        <option v-for="item in layerTypes" :key="item.value" :value="item.value">{{ item.label }}</option>
      </select>
      <label class="field-label" for="layer-url">Service URL</label>
      <input
        id="layer-url"
        v-model="url"
        type="url"
        :placeholder="type === 'xyz' ? 'https://tiles.example.com/{z}/{x}/{y}.png' : 'https://server.example.com/service'"
      />
      <template v-if="type === 'wms'">
        <label class="field-label" for="wms-layers">WMS layers</label>
        <input id="wms-layers" v-model="wmsLayers" placeholder="workspace:roads" />
      </template>
      <button class="button primary add-layer-button" type="button" @click="addLayer"><Plus :size="16" /> Add layer</button>
      <p v-if="error" class="inline-error" role="alert">{{ error }}</p>
    </section>

    <section class="tool-section">
      <div class="section-heading-row">
        <h2>Custom layers</h2>
        <span class="layer-count">{{ layers.length }}</span>
      </div>
      <div v-if="layers.length" class="custom-layer-list">
        <article v-for="(layer, index) in layers" :key="layer.id" class="custom-layer-item">
          <header>
            <button class="icon-button" type="button" :title="layer.visible ? 'Hide layer' : 'Show layer'" @click="toggleLayer(layer)">
              <Eye v-if="layer.visible" :size="16" /><EyeOff v-else :size="16" />
            </button>
            <div><strong>{{ layer.name }}</strong><span>{{ layer.type.toUpperCase() }}</span></div>
            <button class="icon-button" type="button" title="Move layer up" :disabled="index === layers.length - 1" @click="moveLayer(index, 1)"><ArrowUp :size="15" /></button>
            <button class="icon-button" type="button" title="Move layer down" :disabled="index === 0" @click="moveLayer(index, -1)"><ArrowDown :size="15" /></button>
            <button class="icon-button danger-icon" type="button" title="Remove layer" @click="removeLayer(layer)"><Trash2 :size="15" /></button>
          </header>
          <code :title="layer.url">{{ layer.url }}</code>
          <label><span>Opacity</span><input type="range" min="0" max="1" step="0.05" :value="layer.opacity" @input="setOpacity(layer, $event)" /><output>{{ Math.round(layer.opacity * 100) }}%</output></label>
        </article>
      </div>
      <div v-else class="workspace-empty"><Layers3 :size="24" /><span>No custom layers</span></div>
    </section>
  </div>
</template>
