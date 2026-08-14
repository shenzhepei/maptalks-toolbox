<script setup lang="ts">
import { ref } from 'vue'
import { ExternalLink, KeyRound, Trash2, X } from 'lucide-vue-next'
import type { AMapCredentials } from '../lib/credentials'

const props = defineProps<{
  open: boolean
  initial: AMapCredentials | null
  canClose: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [credentials: AMapCredentials]
  clear: []
}>()

const apiKey = ref(props.initial?.apiKey ?? '')
const securityCode = ref(props.initial?.securityCode ?? '')
const error = ref('')

function submit() {
  if (!apiKey.value.trim() || !securityCode.value.trim()) {
    error.value = 'Enter both values to continue.'
    return
  }
  emit('save', { apiKey: apiKey.value, securityCode: securityCode.value })
}
</script>

<template>
  <div v-if="open" class="dialog-backdrop" role="presentation" @click.self="canClose && emit('close')">
    <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="credentials-title">
      <header class="dialog-header">
        <span class="dialog-icon"><KeyRound :size="19" /></span>
        <div>
          <h2 id="credentials-title">AMap credentials</h2>
          <p>Kept in this browser tab only</p>
        </div>
        <button v-if="canClose" class="icon-button" type="button" title="Close" @click="emit('close')">
          <X :size="18" />
        </button>
      </header>

      <form @submit.prevent="submit">
        <label>
          <span>Web JS API key</span>
          <input v-model="apiKey" name="api-key" autocomplete="off" placeholder="Enter your key" />
        </label>
        <label>
          <span>Security code</span>
          <input
            v-model="securityCode"
            name="security-code"
            type="password"
            autocomplete="off"
            placeholder="Enter your security code"
          />
        </label>
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
        <div class="dialog-links">
          <a href="https://console.amap.com/dev/key/app" target="_blank" rel="noreferrer">
            AMap console <ExternalLink :size="14" />
          </a>
          <a href="https://lbs.amap.com/api/javascript-api-v2/guide/abc/prepare" target="_blank" rel="noreferrer">
            Setup guide <ExternalLink :size="14" />
          </a>
        </div>
        <footer class="dialog-actions">
          <button v-if="initial" class="button danger" type="button" @click="emit('clear')">
            <Trash2 :size="16" /> Clear
          </button>
          <span class="action-spacer" />
          <button v-if="canClose" class="button secondary" type="button" @click="emit('close')">Cancel</button>
          <button class="button primary" type="submit">Open map</button>
        </footer>
      </form>
    </section>
  </div>
</template>
