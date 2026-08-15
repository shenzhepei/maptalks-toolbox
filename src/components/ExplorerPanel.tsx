import { Check, Clipboard, LocateFixed, Search } from 'lucide-react'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { convertCoordinate, formatCoordinate, parseCoordinate, type CoordinateSystem } from '../lib/coordinates'
import type { MapRuntime, PlaceResult } from '../lib/map-runtime'

const coordinateSystems: CoordinateSystem[] = ['wgs84', 'gcj02', 'cgcs2000', 'bd09']

export default function ExplorerPanel({ runtime }: { runtime: MapRuntime }) {
  const [query, setQuery] = useState('')
  const [coordinateInput, setCoordinateInput] = useState('')
  const [results, setResults] = useState<PlaceResult[]>([])
  const [selected, setSelected] = useState<[number, number] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')

  const converted = useMemo(() => selected
    ? Object.fromEntries(coordinateSystems.map((target) => [target, convertCoordinate(selected, 'wgs84', target)])) as Record<CoordinateSystem, [number, number]>
    : null, [selected])

  const select = (position: [number, number], center = true): void => {
    setSelected(position)
    setCoordinateInput(formatCoordinate(position))
    runtime.mark(position, { center })
  }

  const search = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    if (!query.trim()) return
    setBusy(true)
    setError('')
    try {
      const nextResults = await runtime.searchPlaces(query.trim())
      setResults(nextResults)
      if (nextResults[0]) select(nextResults[0].position)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Search failed.')
    } finally {
      setBusy(false)
    }
  }

  const goToCoordinate = (event: FormEvent): void => {
    event.preventDefault()
    const position = parseCoordinate(coordinateInput)
    if (!position) {
      setError('Use longitude, latitude within valid ranges.')
      return
    }
    setError('')
    select(position)
  }

  const copy = async (label: string, value: string): Promise<void> => {
    await navigator.clipboard.writeText(value)
    setCopied(label)
    window.setTimeout(() => setCopied(''), 1200)
  }

  useEffect(() => {
    const onMapClick = (event: { coordinate: { x: number; y: number } }): void => {
      select([event.coordinate.x, event.coordinate.y], false)
    }
    runtime.map.on('click', onMapClick)
    return () => runtime.map.off('click', onMapClick)
  }, [runtime])

  return (
    <div className="panel-scroll">
      <section className="tool-section">
        <h2>Place search</h2>
        <form className="input-action" onSubmit={(event) => void search(event)}>
          <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Place keyword" placeholder="Search a place" />
          <button className="icon-button solid" type="submit" title="Search" disabled={busy}><Search size={18} /></button>
        </form>
        {results.length > 0 && (
          <div className="result-list">
            {results.map((item) => (
              <button key={item.id} type="button" onClick={() => select(item.position)}>
                <strong>{item.name}</strong><span>{item.address}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="tool-section">
        <h2>Coordinates</h2>
        <form className="input-action" onSubmit={goToCoordinate}>
          <input value={coordinateInput} onChange={(event) => setCoordinateInput(event.target.value)} aria-label="Longitude and latitude" placeholder="120.155100, 30.274100" />
          <button className="icon-button solid" type="submit" title="Locate"><LocateFixed size={18} /></button>
        </form>
        {converted && (
          <div className="coordinate-list">
            {coordinateSystems.map((label) => {
              const value = converted[label]
              return (
                <button key={label} type="button" title={`Copy ${label}`} onClick={() => void copy(label, formatCoordinate(value))}>
                  <span>{label.toUpperCase()}</span><code>{formatCoordinate(value)}</code>
                  {copied === label ? <Check size={15} /> : <Clipboard size={15} />}
                </button>
              )
            })}
          </div>
        )}
        {error && <p className="inline-error" role="alert">{error}</p>}
      </section>
    </div>
  )
}
