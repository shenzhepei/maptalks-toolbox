<script setup lang="ts">
import { ref } from 'vue'
import { ExternalLink, KeyRound, ShieldCheck, Trash2, X } from 'lucide-vue-next'
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
          <h2 id="credentials-title">Optional AMap services</h2>
          <p>Maptalks works without a key</p>
        </div>
        <button v-if="canClose" class="icon-button" type="button" title="Close" @click="emit('close')">
          <X :size="18" />
        </button>
      </header>

      <form @submit.prevent="submit">
        <div class="credential-privacy" role="note">
          <ShieldCheck :size="18" />
          <div>
            <strong>Your service credentials stay local</strong>
            <span>
              This site never receives or uploads your key. It remains in this browser's local storage until you clear it,
              and is sent directly to AMap only when its services are loaded.
            </span>
          </div>
        </div>
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
          <button class="button primary" type="submit">Save services</button>
        </footer>
      </form>
    </section>
  </div>
</template>
