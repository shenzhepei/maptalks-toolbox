<script setup lang="ts">
import { ref } from 'vue'
import { Map as MapIcon, Satellite } from 'lucide-vue-next'
import type { MapRuntime } from '../lib/map-runtime'

const props = defineProps<{ runtime: MapRuntime }>()

const layer = ref<'standard' | 'satellite'>('standard')

function setLayer(value: 'standard' | 'satellite') {
  if (layer.value === value) return
  layer.value = value
  props.runtime.setSatellite(value === 'satellite')
}
</script>

<template>
  <div class="map-layer-control" role="group" aria-label="Base map layer">
    <button
      type="button"
      :class="{ active: layer === 'standard' }"
      title="Standard map"
      aria-label="Standard map"
      @click="setLayer('standard')"
    >
      <MapIcon :size="18" />
    </button>
    <button
      type="button"
      :class="{ active: layer === 'satellite' }"
      title="Satellite map"
      aria-label="Satellite map"
      @click="setLayer('satellite')"
    >
      <Satellite :size="18" />
    </button>
  </div>
</template>
