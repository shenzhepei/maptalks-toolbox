import { LoaderCircle, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { AMapCredentials } from '../lib/credentials'
import { createMapRuntime, type MapRuntime } from '../lib/map-runtime'

interface MapViewportProps {
  credentials?: AMapCredentials | null
  onReady: (runtime: MapRuntime) => void
  onError: (message: string) => void
}

export default function MapViewport({ credentials, onReady, onError }: MapViewportProps) {
  const container = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let disposed = false
    let runtime: MapRuntime | undefined
    setLoading(true)
    setError('')

    const initialize = (): void => {
      try {
        if (!container.current) return
        const nextRuntime = createMapRuntime(container.current, credentials)
        runtime = nextRuntime
        onReady(nextRuntime)
      } catch (reason) {
        if (disposed) return
        const message = reason instanceof Error ? reason.message : 'The maptalks map could not be loaded.'
        setError(message)
        onError(message)
      } finally {
        if (!disposed) setLoading(false)
      }
    }

    initialize()
    return () => {
      disposed = true
      runtime?.destroy()
    }
  }, [credentials, onError, onReady])

  return (
    <>
      <div ref={container} className="map-canvas" aria-label="maptalks map canvas" />
      {loading && (
        <div className="map-state"><LoaderCircle className="spin" size={22} /><span>Loading map</span></div>
      )}
      {!loading && error && (
        <div className="map-state error-state"><TriangleAlert size={22} /><span>{error}</span></div>
      )}
    </>
  )
}
