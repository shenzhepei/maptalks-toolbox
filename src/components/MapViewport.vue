<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { LoaderCircle, TriangleAlert } from 'lucide-vue-next'
import type { AMapCredentials } from '../lib/credentials'
import { createMapRuntime, type MapRuntime } from '../lib/map-runtime'

const props = defineProps<{ credentials: AMapCredentials }>()
const emit = defineEmits<{ ready: [runtime: MapRuntime]; error: [message: string] }>()

const container = ref<HTMLElement>()
const loading = ref(true)
const error = ref('')
let runtime: MapRuntime | undefined

onMounted(async () => {
  try {
    runtime = await createMapRuntime(container.value!, props.credentials)
    emit('ready', runtime)
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : 'The AMap SDK could not be loaded.'
    emit('error', error.value)
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => runtime?.destroy())
</script>

<template>
  <div ref="container" class="map-canvas" aria-label="AMap canvas" />
  <div v-if="loading" class="map-state">
    <LoaderCircle class="spin" :size="22" />
    <span>Loading map</span>
  </div>
  <div v-else-if="error" class="map-state error-state">
    <TriangleAlert :size="22" />
    <span>{{ error }}</span>
  </div>
</template>
