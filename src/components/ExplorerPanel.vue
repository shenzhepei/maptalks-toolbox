<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Check, Clipboard, LocateFixed, Search } from 'lucide-vue-next'
import { convertCoordinate, formatCoordinate, parseCoordinate, type CoordinateSystem } from '../lib/coordinates'
import type { MapRuntime, PlaceResult } from '../lib/map-runtime'

const props = defineProps<{ runtime: MapRuntime }>()

const query = ref('')
const coordinateInput = ref('')
const results = ref<PlaceResult[]>([])
const selected = ref<[number, number] | null>(null)
const busy = ref(false)
const error = ref('')
const copied = ref('')

const coordinateSystems: CoordinateSystem[] = ['wgs84', 'gcj02', 'cgcs2000', 'bd09']
const converted = computed(() => (selected.value
  ? Object.fromEntries(coordinateSystems.map((target) => [target, convertCoordinate(selected.value!, 'wgs84', target)]))
  : null))

function select(position: [number, number], center = true) {
  selected.value = position
  coordinateInput.value = formatCoordinate(position)
  props.runtime.mark(position, { center })
}

async function search() {
  if (!query.value.trim()) return
  busy.value = true
  error.value = ''
  try {
    results.value = await props.runtime.searchPlaces(query.value.trim())
    if (results.value[0]) select(results.value[0].position)
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'Search failed.'
  } finally {
    busy.value = false
  }
}

function goToCoordinate() {
  const position = parseCoordinate(coordinateInput.value)
  if (!position) {
    error.value = 'Use longitude, latitude within valid ranges.'
    return
  }
  error.value = ''
  select(position)
}

async function copy(label: string, value: string) {
  await navigator.clipboard.writeText(value)
  copied.value = label
  window.setTimeout(() => (copied.value = ''), 1200)
}

function onMapClick(event: any) {
  select([event.coordinate.x, event.coordinate.y], false)
}

onMounted(() => props.runtime.map.on('click', onMapClick))
onBeforeUnmount(() => props.runtime.map.off('click', onMapClick))
</script>

<template>
  <div class="panel-scroll">
    <section class="tool-section">
      <h2>Place search</h2>
      <form class="input-action" @submit.prevent="search">
        <input v-model="query" aria-label="Place keyword" placeholder="Search a place" />
        <button class="icon-button solid" type="submit" title="Search" :disabled="busy">
          <Search :size="18" />
        </button>
      </form>
      <div v-if="results.length" class="result-list">
        <button v-for="item in results" :key="item.id" type="button" @click="select(item.position)">
          <strong>{{ item.name }}</strong>
          <span>{{ item.address }}</span>
        </button>
      </div>
    </section>

    <section class="tool-section">
      <h2>Coordinates</h2>
      <form class="input-action" @submit.prevent="goToCoordinate">
        <input v-model="coordinateInput" aria-label="Longitude and latitude" placeholder="120.155100, 30.274100" />
        <button class="icon-button solid" type="submit" title="Locate">
          <LocateFixed :size="18" />
        </button>
      </form>
      <div v-if="converted" class="coordinate-list">
        <button
          v-for="(value, label) in converted"
          :key="label"
          type="button"
          :title="`Copy ${label}`"
          @click="copy(label, formatCoordinate(value))"
        >
          <span>{{ label.toUpperCase() }}</span>
          <code>{{ formatCoordinate(value) }}</code>
          <Check v-if="copied === label" :size="15" />
          <Clipboard v-else :size="15" />
        </button>
      </div>
      <p v-if="error" class="inline-error" role="alert">{{ error }}</p>
    </section>
  </div>
</template>
