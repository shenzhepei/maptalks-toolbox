export interface ExportTileStore {
  kind: 'indexeddb' | 'memory'
  put: (index: number, blob: Blob) => Promise<void>
  get: (index: number) => Promise<Blob>
  dispose: () => Promise<void>
}

function createMemoryTileStore(): ExportTileStore {
  const values = new Map<number, Blob>()
  return {
    kind: 'memory',
    async put(index, blob) {
      values.set(index, blob)
    },
    async get(index) {
      const value = values.get(index)
      if (!value) throw new Error(`Captured tile ${index + 1} is missing.`)
      return value
    },
    async dispose() {
      values.clear()
    },
  }
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'))
  })
}

export async function createExportTileStore(factory: IDBFactory | undefined = globalThis.indexedDB): Promise<ExportTileStore> {
  if (!factory) return createMemoryTileStore()

  const databaseName = `amap-toolbox-export-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const openRequest = factory.open(databaseName, 1)
  openRequest.onupgradeneeded = () => openRequest.result.createObjectStore('tiles')
  const database = await requestResult(openRequest)

  return {
    kind: 'indexeddb',
    put(index, blob) {
      return requestResult(database.transaction('tiles', 'readwrite').objectStore('tiles').put(blob, index)).then(() => undefined)
    },
    async get(index) {
      const value = await requestResult(database.transaction('tiles', 'readonly').objectStore('tiles').get(index))
      if (!(value instanceof Blob)) throw new Error(`Captured tile ${index + 1} is missing.`)
      return value
    },
    async dispose() {
      database.close()
      await new Promise<void>((resolve) => {
        const request = factory.deleteDatabase(databaseName)
        request.onsuccess = () => resolve()
        request.onerror = () => resolve()
        request.onblocked = () => resolve()
      })
    },
  }
}
